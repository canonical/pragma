/**
 * Discover skills from resolved source packages.
 *
 * Scans each skill source directory for immediate subdirectories
 * containing a valid SKILL.md file. Skips missing source paths
 * and invalid frontmatter gracefully.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type SkillSource,
  parseFrontmatter,
  resolveSkillSources,
} from "../helpers/index.js";
import type { DiscoveredSkill } from "../types.js";

export default async function discoverSkills(
  _cwd: string,
  overrideSources?: SkillSource[],
): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];
  const sources = overrideSources ?? resolveSkillSources();

  for (const source of sources) {
    let entries: string[];
    try {
      entries = await readdir(source.dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = resolve(source.dir, entry);
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
        sourcePath: `${source.relativePath}/${entry}`,
        sourcePackage: source.packageName,
        folderName: entry,
        frontmatter,
      });
    }
  }

  return skills;
}
