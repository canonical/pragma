import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PragmaError } from "#error";
import { suggestNames } from "../../shared/suggestions/index.js";
import type { SkillSource } from "../helpers/index.js";
import type { SkillDetailed } from "../types.js";
import discoverSkills from "./discover.js";

/**
 * Look up one skill by name or folder name and serve its content.
 *
 * Matches case-insensitively against the frontmatter name and the skill's
 * folder name, then reads the full SKILL.md text plus the names of any
 * companion files shipped alongside it (e.g. spec documents).
 *
 * @param cwd - Working directory.
 * @param query - Skill name or folder name to look up.
 * @param overrideSources - Optional override for skill source definitions.
 * @returns The matched skill with content and companion file names.
 * @throws PragmaError with code ENTITY_NOT_FOUND and ranked suggestions
 *   when no skill matches.
 * @note Impure — reads SKILL.md and the skill directory listing.
 */
export default async function lookupSkill(
  cwd: string,
  query: string,
  overrideSources?: SkillSource[],
): Promise<SkillDetailed> {
  const skills = await discoverSkills(cwd, overrideSources);
  const queryLower = query.toLowerCase();
  const match = skills.find(
    (skill) =>
      skill.name.toLowerCase() === queryLower ||
      skill.folderName.toLowerCase() === queryLower,
  );

  if (!match) {
    throw PragmaError.notFound("skill", query, {
      suggestions: suggestNames(
        query,
        skills.map((skill) => skill.name),
      ),
      recovery: {
        message: "List available skills.",
        cli: "pragma skill list",
        mcp: { tool: "skill_list" },
      },
    });
  }

  const content = await readFile(
    resolve(match.sourcePath, "SKILL.md"),
    "utf-8",
  );
  const files = await listCompanionFiles(match.sourcePath);

  return { ...match, content, files };
}

async function listCompanionFiles(dir: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name !== "SKILL.md")
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}
