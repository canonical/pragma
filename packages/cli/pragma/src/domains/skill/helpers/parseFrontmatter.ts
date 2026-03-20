/**
 * Parse YAML frontmatter from a SKILL.md file.
 *
 * Extracts the `---`-delimited YAML block at the start of the file
 * and validates required fields per the agentskills.io spec.
 * Returns null for missing or malformed frontmatter.
 */

import type { SkillFrontmatter } from "../types.js";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

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

function parseSimpleYaml(block: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let nestedObject: Record<string, unknown> | null = null;

  for (const line of block.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const indented = line.match(/^(\s+)(\w[\w-]*)\s*:\s*(.*)/);
    const topLevel = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);

    if (indented && currentKey && (indented[1]?.length ?? 0) >= 2) {
      if (!nestedObject) nestedObject = {};
      const key = indented[2] as string;
      const value = (indented[3] ?? "").trim();
      nestedObject[key] = value === "" ? true : parseYamlValue(value);
    } else if (topLevel) {
      if (currentKey && nestedObject) {
        result[currentKey] = nestedObject;
        nestedObject = null;
      }

      const key = topLevel[1] as string;
      const value = topLevel[2] ?? "";
      currentKey = key;
      if (value === "") {
        nestedObject = {};
      } else {
        result[key] = parseYamlValue(value);
        nestedObject = null;
      }
    }
  }

  if (currentKey && nestedObject) {
    result[currentKey] = nestedObject;
  }

  return result;
}

export default function parseFrontmatter(
  content: string,
): SkillFrontmatter | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match?.[1]) return null;

  const parsed = parseSimpleYaml(match[1]);

  if (typeof parsed.name !== "string" || parsed.name === "") return null;
  if (typeof parsed.description !== "string" || parsed.description === "")
    return null;

  return {
    name: parsed.name,
    description: parsed.description,
    ...(typeof parsed.license === "string" && { license: parsed.license }),
    ...(Array.isArray(parsed.compatibility) && {
      compatibility: parsed.compatibility,
    }),
    ...(typeof parsed.metadata === "object" &&
      parsed.metadata !== null && {
        metadata: parsed.metadata as Readonly<Record<string, unknown>>,
      }),
  };
}
