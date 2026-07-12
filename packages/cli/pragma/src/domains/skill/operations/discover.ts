import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  parseFrontmatter,
  resolveSkillSources,
  type SkillSource,
} from "../helpers/index.js";
import type { DiscoveredSkill } from "../types.js";

/**
 * Discover skills from resolved skill source directories.
 *
 * Each source directory is one skill folder (`<package>/skills/<name>`)
 * containing a `SKILL.md` with YAML frontmatter — the granularity
 * produced by the package loaders' `readPackageDir`. Missing files and
 * invalid frontmatter are skipped gracefully (invalid frontmatter is
 * reported on stderr).
 *
 * @param _cwd - Working directory (unused, sources are resolved globally).
 * @param overrideSources - Optional override for skill source definitions.
 * @returns Array of discovered skills with parsed frontmatter.
 * @note Impure — reads SKILL.md files from the filesystem.
 */
export default async function discoverSkills(
  _cwd: string,
  overrideSources?: SkillSource[],
): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];
  const sources = overrideSources ?? resolveSkillSources();

  for (const source of sources) {
    const skillMdPath = resolve(source.dir, "SKILL.md");
    let content: string;
    try {
      content = await readFile(skillMdPath, "utf-8");
    } catch {
      continue;
    }

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) {
      process.stderr.write(
        `Warning: invalid SKILL.md frontmatter in ${skillMdPath}\n`,
      );
      continue;
    }

    skills.push({
      name: frontmatter.name,
      description: frontmatter.description,
      sourcePath: source.dir,
      sourcePackage: source.packageName,
      folderName: basename(source.dir),
      frontmatter,
    });
  }

  return skills;
}
