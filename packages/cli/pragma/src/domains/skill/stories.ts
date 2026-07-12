/**
 * Skill read stories — the single declaration of `skill list` and
 * `skill lookup` for both surfaces.
 *
 * `skill lookup` serves the full SKILL.md content, making skills directly
 * consumable by agents over MCP (previously only metadata was listed).
 */

import { PragmaError } from "#error";
import lookupMany from "../shared/lookupMany.js";
import {
  type LookupStory,
  type ReadStory,
  requirePragmaContext,
} from "../shared/stories/index.js";
import { listFormatters, lookupFormatters } from "./formatters/index.js";
import type { SkillListInput } from "./formatters/types.js";
import {
  discoverSkills,
  listSkills,
  lookupSkill,
  type SkillListResult,
} from "./operations/index.js";
import type { SkillDetailed } from "./types.js";

/** The `skill list` / `skill_list` read story. */
export const skillListStory: ReadStory<SkillListResult, SkillListInput> = {
  noun: "skill",
  verb: "list",
  description: "List available agent skills from design system packages",
  toolDescription: "List available agent skills from design system packages.",
  params: [
    {
      name: "detailed",
      type: "boolean",
      description: "Show full metadata for each skill",
      default: false,
      surfaces: "cli",
    },
  ],
  examples: [
    "pragma skill list",
    "pragma skill list --detailed",
    "pragma skill list --llm",
    "pragma skill list --format json",
  ],
  resolve: (rt) => listSkills(rt.cwd),
  toOutput: ({ skills, sources }, params) => ({
    skills,
    sources,
    detailed: params.detailed === true,
  }),
  formatters: listFormatters,
  toEnvelope: ({ skills, sources }) => ({
    data: { skills, sources },
    meta: { count: skills.length },
  }),
  emptyError: ({ skills, sources }) => {
    if (skills.length > 0) return undefined;
    const allUnavailable = sources.every((source) => !source.available);
    return PragmaError.emptyResults("skill", {
      recovery: {
        message: allUnavailable
          ? "Install @canonical packages first"
          : "No SKILL.md files found in source packages",
      },
    });
  },
};

/** The `skill lookup` / `skill_lookup` read story. */
export const skillLookupStory: LookupStory<SkillDetailed, SkillDetailed> = {
  noun: "skill",
  description: "Show full instructions for a skill by name",
  toolDescription:
    "Get full skill instructions (SKILL.md content) for one or more agent skills by name.",
  namesDescription: "Skill names",
  namesToolDescription: "Skill names to look up (e.g. ['design-auditor'])",
  complete: async (partial, cmdCtx) => {
    const ctx = requirePragmaContext(cmdCtx);
    const skills = await discoverSkills(ctx.cwd);
    return skills
      .map((skill) => skill.name)
      .filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()));
  },
  examples: [
    "pragma skill lookup design-auditor",
    "pragma skill lookup design-auditor add-standard",
    "pragma skill lookup design-auditor --llm",
  ],
  resolve: (rt, names) =>
    lookupMany(names, (query) => lookupSkill(rt.cwd, query)),
  toFmtInput: (skill) => skill,
  formatters: lookupFormatters,
  emptyNamesError: () =>
    PragmaError.invalidInput("names", "(empty)", {
      recovery: {
        message: "List available skills.",
        cli: "pragma skill list",
        mcp: { tool: "skill_list" },
      },
    }),
};
