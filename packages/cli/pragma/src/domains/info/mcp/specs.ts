/**
 * MCP tool spec for the info domain.
 *
 * Uses shared operations (collectStoreSummary, resolveTierChain) instead of
 * inlining data assembly. Skips the npm registry check to avoid network
 * latency in MCP tool calls — sets `updateSkipped: true`.
 */

import { VERSION } from "#constants";
import { detectInstallSource } from "#package-manager";
import { CHANNEL_RELEASES } from "../../shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { renderInfoLlm } from "../formatters/index.js";
import { collectStoreSummary } from "../operations/index.js";
import type { InfoData } from "../types.js";

const specs: readonly ToolSpec[] = [
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
      const install = detectInstallSource();
      const tierChain =
        rt.config.tier !== undefined ? resolveTierChain(rt.config.tier) : [];
      const channelReleases = CHANNEL_RELEASES[rt.config.channel];
      const storeSummary = await collectStoreSummary(rt.store);

      const data: InfoData = {
        version: VERSION,
        pm: install.packageManager,
        installSource: install.label,
        configPath: "pragma.config.json",
        tier: rt.config.tier,
        tierChain,
        channel: rt.config.channel,
        channelReleases: [...channelReleases],
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
