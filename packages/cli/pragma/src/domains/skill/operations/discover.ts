/**
 * Discover skills from hardcoded source paths.
 *
 * Scans each SKILL_SOURCES entry for immediate subdirectories
 * containing a valid SKILL.md file. Skips missing source paths
 * and invalid frontmatter gracefully.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SKILL_SOURCES, SOURCE_PACKAGE_MAP } from "../constants.js";
import { parseFrontmatter } from "../helpers/index.js";
import type { DiscoveredSkill } from "../types.js";

export default async function discoverSkills(
  cwd: string,
): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];

  for (const source of SKILL_SOURCES) {
    const sourceDir = resolve(cwd, source);
    const packageName = SOURCE_PACKAGE_MAP[source] ?? source;

    let entries: string[];
    try {
      entries = await readdir(sourceDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = resolve(sourceDir, entry);
      const entryStat = await stat(entryPath).catch(() => null);
      if (!entryStat?.isDirectory()) continue;

      const skillMdPath = resolve(entryPath, "SKILL.md");
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
        sourcePath: `${source}/${entry}`,
        sourcePackage: packageName,
        folderName: entry,
        frontmatter,
      });
    }
  }

  return skills;
}
