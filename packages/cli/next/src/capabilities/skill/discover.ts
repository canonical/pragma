/**
 * Storeless skill discovery over the filesystem.
 *
 * A skill is a folder with a `SKILL.md` carrying YAML frontmatter (`name`,
 * `description`, and the #856 `prompt` flag among others). Skills are discovered
 * from conventional roots — installed skills under `$XDG_DATA_HOME/pragma/skills`
 * and project skills under `<cwd>/.pragma/skills` — with missing files and
 * invalid frontmatter skipped gracefully. Reads only the filesystem, never the
 * graph store, so `skill list`/`lookup` are storeless (needsStore: false).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/** Parsed SKILL.md frontmatter. */
export interface SkillFrontmatter {
  readonly name: string;
  readonly description: string;
  /** #856 — whether this skill also registers as an MCP prompt. */
  readonly prompt?: boolean;
  readonly license?: string;
  readonly compatibility?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A discovered skill: its frontmatter plus where it was found. */
export interface DiscoveredSkill {
  readonly name: string;
  readonly description: string;
  readonly folderName: string;
  readonly sourcePath: string;
  readonly frontmatter: SkillFrontmatter;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** Parse one YAML scalar (string, boolean, number, or inline array). */
function parseYamlValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") return num;
  return trimmed.replace(/^["']|["']$/g, "");
}

/** Parse a simple YAML subset (top-level keys + one nesting level). */
function parseSimpleYaml(block: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let nested: Record<string, unknown> | null = null;
  for (const line of block.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indented = line.match(/^(\s+)(\w[\w-]*)\s*:\s*(.*)/);
    const topLevel = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (indented && currentKey && (indented[1]?.length ?? 0) >= 2) {
      if (!nested) nested = {};
      nested[indented[2] as string] = parseYamlValue(
        (indented[3] ?? "").trim(),
      );
    } else if (topLevel) {
      if (currentKey && nested) {
        result[currentKey] = nested;
        nested = null;
      }
      const key = topLevel[1] as string;
      const value = topLevel[2] ?? "";
      currentKey = key;
      if (value === "") {
        nested = {};
      } else {
        result[key] = parseYamlValue(value);
        nested = null;
      }
    }
  }
  if (currentKey && nested) result[currentKey] = nested;
  return result;
}

/** Extract and validate SKILL.md frontmatter; `null` when missing/invalid. */
export function parseFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match?.[1]) return null;
  const parsed = parseSimpleYaml(match[1]);
  if (typeof parsed.name !== "string" || parsed.name === "") return null;
  if (typeof parsed.description !== "string" || parsed.description === "") {
    return null;
  }
  return {
    name: parsed.name,
    description: parsed.description,
    ...(typeof parsed.prompt === "boolean" ? { prompt: parsed.prompt } : {}),
    ...(typeof parsed.license === "string" ? { license: parsed.license } : {}),
    ...(Array.isArray(parsed.compatibility)
      ? { compatibility: parsed.compatibility as string[] }
      : {}),
    ...(typeof parsed.metadata === "object" && parsed.metadata !== null
      ? { metadata: parsed.metadata as Record<string, unknown> }
      : {}),
  };
}

/** The conventional roots skills are discovered from. */
export function skillRoots(cwd: string): string[] {
  const dataHome =
    process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return [join(dataHome, "pragma", "skills"), join(cwd, ".pragma", "skills")];
}

/** Immediate subdirectories of `root` (each a candidate skill folder). */
function subdirs(root: string): string[] {
  try {
    return readdirSync(root)
      .map((name) => join(root, name))
      .filter((path) => {
        try {
          return statSync(path).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

/**
 * Discover every skill reachable from the conventional roots.
 *
 * @param cwd - The project directory (project skills root).
 * @returns Discovered skills, sorted by name; malformed ones are skipped.
 * @note Impure — reads SKILL.md files.
 */
export function discoverSkills(cwd: string): DiscoveredSkill[] {
  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();
  for (const root of skillRoots(cwd)) {
    for (const dir of subdirs(root)) {
      let content: string;
      try {
        content = readFileSync(join(dir, "SKILL.md"), "utf-8");
      } catch {
        continue;
      }
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter || seen.has(frontmatter.name)) continue;
      seen.add(frontmatter.name);
      skills.push({
        name: frontmatter.name,
        description: frontmatter.description,
        folderName: basename(dir),
        sourcePath: dir,
        frontmatter,
      });
    }
  }
  return skills.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}
