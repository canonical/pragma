/**
 * MCP tool specs for doctor domain — doctor, info.
 *
 * The info tool is cross-domain: it uses operations and formatters from
 * the info domain, plus VERSION from #constants.
 */

import { VERSION } from "#constants";
import { renderInfoLlm } from "../../info/formatters/index.js";
import { collectStoreSummary } from "../../info/operations/index.js";
import type { InfoData } from "../../info/types.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { doctorFormatters } from "../formatters/index.js";
import { runChecks } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "doctor",
    description:
      "Run health checks on the pragma environment. Validates config, store, completions, skills, and more.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const result = await runChecks({ cwd: rt.cwd });

      if (params.condensed) {
        const text = doctorFormatters.llm(result);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result };
    },
  },
  {
    name: "info",
    description: "Show pragma version, configuration, and store summary.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const storeSummary = await collectStoreSummary(rt.store);

      const data: InfoData = {
        version: VERSION,
        pm: "unknown",
        installSource: "local install",
        configPath: "pragma.config.json",
        tier: rt.config.tier,
        tierChain: [],
        channel: rt.config.channel,
        channelReleases: [],
        update: undefined,
        updateSkipped: true,
        store: storeSummary,
      };

      if (params.condensed) {
        const text = renderInfoLlm(data);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data };
    },
  },
];

export default specs;
