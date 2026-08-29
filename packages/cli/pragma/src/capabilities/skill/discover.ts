/**
 * Storeless skill discovery over the filesystem.
 *
 * A skill is a folder with a `SKILL.md` carrying YAML frontmatter (`name`,
 * `description`, and the #856 `prompt` flag among others). Skills are discovered
 * from conventional roots — project skills under `<cwd>/.pragma/skills`, which
 * take precedence, then installed skills under `$XDG_DATA_HOME/pragma/skills`,
 * then the BUNDLED snapshot this package ships (`bundled-skills/`) — with
 * missing files and invalid frontmatter skipped gracefully. Reads only the
 * filesystem, never the graph store, so `skill list`/`lookup` are storeless
 * (needsStore: false).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BIN_NAME } from "../../constants.js";

/** Parsed SKILL.md frontmatter. */
export interface SkillFrontmatter {
  readonly name: string;
  readonly description: string;
  /** #856 — whether this skill also registers as an MCP prompt. */
  readonly prompt?: boolean;
  readonly license?: string;
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
  };
}

/**
 * The installed-skills root: `$XDG_DATA_HOME/<bin>/skills`. This is where
 * `sources update` INSTALLS package-provided skills (U10) — a symlink per skill
 * — and the second discovery root below reads them back. The single source of
 * truth for both, so the install target and the discovery root can never drift.
 *
 * Namespaced by {@link BIN_NAME}, like config, state and cache: two
 * distributions installed side by side owned ONE skills root, so a `recipes`
 * build served skills a `pragma` build had installed and could not install its
 * own without colliding.
 */
export function installedSkillsDir(): string {
  const dataHome =
    process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(dataHome, BIN_NAME, "skills");
}

/**
 * The project skills root: `<cwd>/.<bin>/skills` — skills that belong to THIS
 * repository and travel with it. Named separately from {@link skillRoots}
 * because the two roots are also the two setup SCOPES: `setup skills --local`
 * links this root into the project's harness directories, while the global scope
 * links {@link installedSkillsDir} into the user-level ones. Mixing them leaks
 * machine state into a repository's directories, or applies one repository's
 * skills machine-wide.
 */
export function projectSkillsDir(cwd: string): string {
  return join(cwd, `.${BIN_NAME}`, "skills");
}

/**
 * The directory name of the SNAPSHOT of pack skills this package ships, at its
 * own root. Written by `scripts/bundle.ts` and COMMITTED, exactly as
 * `src/kernel/runtime/graphpack/embedded/pack.generated.ts` is — see
 * {@link bundledSkillsDir}.
 */
const BUNDLED_SKILLS_DIRNAME = "bundled-skills";

/**
 * How far above this module the package root can be. `src/capabilities/skill`
 * is three levels up; the emitted `dist/src/capabilities/skill` is four. The
 * bound exists so a tree that is MISSING the artifact stops at the package
 * instead of walking to `/` and adopting an unrelated directory.
 */
const BUNDLED_SEARCH_DEPTH = 6;

/**
 * The BUNDLED-skills root: `<package root>/bundled-skills`, the snapshot of the
 * declared packs' `skills/<name>/` that `scripts/bundle.ts` commits alongside
 * the embedded graph — `undefined` when this build ships none.
 *
 * WHY IT EXISTS. The embedded pack (`pack.generated.ts`) is what lets a fresh
 * install answer `block lookup` offline. The skills came out of the very same
 * `resolvePackage` calls and were left on the build machine's disk, so the same
 * fresh install listed ZERO skills and told the user to run `sources update`
 * first — a network round trip and two commands for something already resolved
 * at release time. This is the skills half of the snapshot the graph has had
 * all along.
 *
 * WHY IT IS FOUND BY WALKING UP rather than by a fixed relative path. `files`
 * ships BOTH `src` and `dist`, and `tsconfig.build.json` sets `rootDir: "."`,
 * so this module runs from `src/capabilities/skill/` in a source or test run
 * and from `dist/src/capabilities/skill/` in the shipped one — the package root
 * is three levels up in one and four in the other, and no single
 * `new URL("../../..")` is right for both. The walk anchors on the artifact's
 * own name sitting NEXT TO a `package.json`, which is true only at the package
 * root: `dist/` carries a `package.json` too (`resolveJsonModule` copies it)
 * but never the snapshot.
 *
 * @returns The bundled root, or `undefined` when no ancestor holds one.
 * @note Impure — stats up to {@link BUNDLED_SEARCH_DEPTH} ancestor directories.
 *   Reached from the `__complete` fast path, so it stays `node:fs` /
 *   `node:path` / `node:url` only and costs a handful of `stat`s.
 */
export function bundledSkillsDir(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < BUNDLED_SEARCH_DEPTH; up += 1) {
    const candidate = join(dir, BUNDLED_SKILLS_DIRNAME);
    if (existsSync(join(dir, "package.json")) && existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * The conventional roots skills are discovered from, in PRECEDENCE order: the
 * project root (`<cwd>/.<bin>/skills`) FIRST so a project-local skill overrides
 * an installed skill of the same name (`discoverSkills` dedups first-seen-wins),
 * then installed skills under `$XDG_DATA_HOME/<bin>/skills` (where package
 * skills land on `sources update`), then the BUNDLED snapshot
 * ({@link bundledSkillsDir}).
 *
 * BUNDLED IS LAST, and that order is the whole contract. The snapshot is as old
 * as the release; an installed skill came from a `sources update` the user ran
 * deliberately, and a project skill is the repository's own. So someone who
 * updates gets the CURRENT skill and never the shipped copy, while a fresh
 * install — which has neither of the first two roots — still gets the packs'
 * skills instead of an empty list and a two-command recovery.
 */
export function skillRoots(cwd: string): string[] {
  return [projectSkillsDir(cwd), ...globalSkillRoots()];
}

/**
 * The GLOBAL scope's source roots, in precedence order: the INSTALLED root
 * (`sources update`'s output) first, then the BUNDLED snapshot.
 *
 * Named separately from {@link skillRoots} for the reason
 * {@link projectSkillsDir} is: these are the two roots `setup skills --global`
 * links into the user-level harness directories, and `skillRoots` is discovery,
 * which spans both scopes. Reading the project root for the global scope is
 * exactly the cross-scope leak the scope split exists to prevent.
 *
 * A BAND CAN HOLD MORE THAN ONE ROOT, and this is where that became true. The
 * global scope's ownership test and its stale-link sweep therefore range over
 * the SET (see `setup/operations/setupSkills.ts`), never over one path.
 */
export function globalSkillRoots(): string[] {
  const bundled = bundledSkillsDir();
  return bundled === undefined
    ? [installedSkillsDir()]
    : [installedSkillsDir(), bundled];
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
 * Discover every skill reachable from an EXPLICIT list of roots, in precedence
 * order (first-seen wins on a duplicate name).
 *
 * Split out of {@link discoverSkills} so a caller that owns one scope can read
 * exactly that scope's root: `setup skills` links the project root into project
 * harness directories and the installed root into user-level ones, and reading
 * both roots for either scope is what used to mix the two.
 *
 * @param roots - The roots to read, in precedence order.
 * @returns Discovered skills, sorted by name; malformed ones are skipped.
 * @note Impure — reads SKILL.md files.
 */
export function discoverSkillsFrom(
  roots: readonly string[],
): DiscoveredSkill[] {
  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
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

/**
 * Discover every skill reachable from the conventional roots.
 *
 * @param cwd - The project directory (project skills root).
 * @returns Discovered skills, sorted by name; malformed ones are skipped.
 * @note Impure — reads SKILL.md files.
 */
export function discoverSkills(cwd: string): DiscoveredSkill[] {
  return discoverSkillsFrom(skillRoots(cwd));
}
