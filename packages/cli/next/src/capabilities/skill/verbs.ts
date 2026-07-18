/**
 * `skill list` and `skill lookup <name>` — storeless filesystem discovery.
 *
 * Both read SKILL.md files from the conventional roots (never the graph store),
 * so they are needsStore: false. `lookup` additionally returns the skill's
 * instructions (the SKILL.md body after the frontmatter).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { suggestNames } from "../../kernel/project/cli/suggestNames.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { type DiscoveredSkill, discoverSkills } from "./discover.js";
import { skillListFormatters, skillLookupFormatters } from "./render.js";

/** A looked-up skill: its metadata plus the SKILL.md instructions body. */
export interface SkillLookup extends DiscoveredSkill {
  readonly instructions: string;
}

const listVerb: VerbSpec<Record<string, unknown>, DiscoveredSkill[]> = {
  path: ["skill", "list"],
  summary: "List discovered skills (SKILL.md files under the skill roots).",
  params: [],
  output: { formatters: skillListFormatters },
  examples: [{ cmd: "pragma skill list" }],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: async (_params: Record<string, unknown>, rt: PragmaRuntime) =>
    discoverSkills(rt.cwd),
};

const lookupVerb: VerbSpec<Record<string, unknown>, SkillLookup> = {
  path: ["skill", "lookup"],
  summary: "Show a skill's metadata and instructions by name.",
  params: [
    {
      kind: "string",
      name: "name",
      doc: "The skill name.",
      positional: true,
      required: true,
    },
  ],
  output: { formatters: skillLookupFormatters },
  examples: [{ cmd: "pragma skill lookup docx" }],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: async (params: Record<string, unknown>, rt: PragmaRuntime) => {
    const name = String(params.name);
    const skills = discoverSkills(rt.cwd);
    const match = skills.find(
      (skill) => skill.name.toLowerCase() === name.toLowerCase(),
    );
    if (!match) {
      throw PragmaError.notFound("skill", name, {
        suggestions: suggestNames(
          name,
          skills.map((skill) => skill.name),
        ),
        recovery: {
          message: "List discovered skills.",
          cli: "pragma skill list",
          mcp: { tool: "skill_list" },
        },
      });
    }
    return { ...match, instructions: readInstructions(match.sourcePath) };
  },
};

/** Read the SKILL.md body after its frontmatter block. */
function readInstructions(dir: string): string {
  try {
    const content = readFileSync(join(dir, "SKILL.md"), "utf-8");
    return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  } catch {
    return "";
  }
}

/** The `skill` verbs (`list`, `lookup`). */
export const skillListVerb = asVerb(listVerb);
export const skillLookupVerb = asVerb(lookupVerb);
