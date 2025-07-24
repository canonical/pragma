import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RulesetLocation } from "../types.js";

/**
 * Discovers .ruleset.json files in a directory
 */
export default async function discoverRulesetsInDir(
  dir: string,
  type: "bundled" | "local",
): Promise<RulesetLocation[]> {
  const rulesets: RulesetLocation[] = [];

  try {
    const files = await readdir(dir);
    const rulesetFiles = files.filter((f) => f.endsWith(".ruleset.json"));

    for (const file of rulesetFiles) {
      // For local files, try to parse to verify it's valid JSON
      if (type === "local") {
        try {
          const content = await readFile(join(dir, file), "utf-8");
          JSON.parse(content);
        } catch {
          // Skip files that aren't valid JSON
          continue;
        }
      }

      rulesets.push({
        type,
        name: file.replace(".ruleset.json", ""),
        path: join(dir, file),
      });
    }
  } catch {
    // Directory might not exist or be readable
  }

  return rulesets;
}
