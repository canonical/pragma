/**
 * D4 (FLAGGED REVERSIBLE) — skill-stub prompt projection.
 *
 * Every discovered skill auto-projects a stub prompt (name + description
 * + "load skill X"), so protocol-complete clients can discover deep
 * guidance through `prompts/list` without a bespoke catalog. Suppression,
 * in precedence order: an authored prompt of the same name, SKILL.md
 * frontmatter `prompt: false`, and the user config off-switch
 * (`prompts.skillStubs: false | ["name", …]`).
 *
 * The whole projection lives in THIS function so reverting D4 is one
 * deletion (plus its call site in the registry loader).
 */

import type { PragmaConfig } from "#config";
import type { SemanticPackage } from "../../shared/semanticPackage.js";
import {
  resolveSkillSources,
  type SkillSource,
} from "../../skill/helpers/index.js";
import { discoverSkills } from "../../skill/operations/index.js";
import type { PromptRegistryEntry } from "../types.js";

/** Kebab-ish names a stub can safely register under (prompt name rule). */
const STUB_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Project discovered skills into stub prompt registry entries.
 *
 * Skill sources come from the runtime's resolved packages (the same set
 * whose graphs are loaded), so a test runtime with no packages projects
 * no stubs and a configured install projects exactly its own.
 *
 * @param runtime - Slice carrying cwd, merged config (`prompts.skillStubs`
 *   is the off-switch), and resolved packages.
 * @param taken - Prompt names already claimed by authored prompts — an
 *   authored prompt of the same name suppresses the stub silently.
 * @param overrideSources - Optional skill-source override for tests.
 * @returns Stub entries, in discovery order.
 * @note Impure — reads SKILL.md files; warns on stderr for unusable names.
 */
export default async function projectSkillStubs(
  runtime: {
    readonly cwd: string;
    readonly config: PragmaConfig;
    readonly packages: readonly SemanticPackage[];
  },
  taken: ReadonlySet<string>,
  overrideSources?: SkillSource[],
): Promise<PromptRegistryEntry[]> {
  const skillStubs = runtime.config.prompts?.skillStubs;
  if (skillStubs === false) return [];
  const disabled = new Set(Array.isArray(skillStubs) ? skillStubs : []);

  const sources = overrideSources ?? resolveSkillSources(runtime.packages);
  const entries: PromptRegistryEntry[] = [];
  const seen = new Set<string>();

  for (const skill of await discoverSkills(runtime.cwd, sources)) {
    if (skill.frontmatter.prompt === false) continue;
    if (disabled.has(skill.name)) continue;
    if (taken.has(skill.name)) continue; // authored prompt wins, silently
    if (seen.has(skill.name)) {
      process.stderr.write(
        `Warning: skipping skill-stub prompt "${skill.name}" from ${skill.sourcePath} — the name is already provided by another skill.\n`,
      );
      continue;
    }
    if (!STUB_NAME.test(skill.name)) {
      process.stderr.write(
        `Warning: skipping skill-stub prompt for "${skill.name}" — the skill name is not a valid prompt name.\n`,
      );
      continue;
    }
    seen.add(skill.name);
    entries.push({
      definition: {
        name: skill.name,
        description: skill.description,
        template:
          `Load the skill "${skill.name}" (skill_lookup { name: "${skill.name}" } · ` +
          `pragma skill lookup ${skill.name}) and follow its instructions.\n\n` +
          skill.description,
      },
      source: `skill:${skill.sourcePackage}/${skill.folderName}`,
    });
  }

  return entries;
}
