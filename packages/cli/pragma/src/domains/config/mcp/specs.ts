/**
 * MCP tool specs for the config domain — config_show, config_tier,
 * config_channel.
 *
 * config_show is compiled from the config read story in `../stories.ts`
 * so both surfaces share resolution and formatters; the mutating tier and
 * channel tools are spec'd by hand.
 */

import { readConfig, writeConfig } from "#config";
import { compileReadTool } from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { validateChannel, validateTier } from "../operations/index.js";
import { configShowStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(configShowStory),
  {
    name: "config_tier",
    description:
      "Set or reset the active tier. Pass a tier path to set, or reset=true to clear.",
    params: {
      path: {
        type: "string",
        description: "Tier path (e.g. 'global', 'apps/lxd')",
        optional: true,
      },
      reset: {
        type: "boolean",
        description: "Reset tier to default",
        optional: true,
      },
      global: {
        type: "boolean",
        description: "Write to the global config instead of the project file",
        optional: true,
      },
    },
    readOnly: false,
    async execute(rt, { path, reset, global: globalScope }) {
      const scope = globalScope === true ? "global" : undefined;

      if (reset) {
        const written = writeConfig(rt.cwd, { tier: undefined }, scope);
        return { data: { tier: null, action: "reset", path: written } };
      }

      if (path) {
        await validateTier(rt.store, path as string);
        const written = writeConfig(rt.cwd, { tier: path as string }, scope);
        return { data: { tier: path, action: "set", path: written } };
      }

      const config = readConfig(rt.cwd);
      return { data: { tier: config.tier ?? null, action: "query" } };
    },
  },
  {
    name: "config_channel",
    description:
      "Set or reset the release channel. Pass a value to set, or reset=true to clear.",
    params: {
      value: {
        type: "string",
        description: "Channel (normal, experimental, prerelease)",
        optional: true,
      },
      reset: {
        type: "boolean",
        description: "Reset channel to normal",
        optional: true,
      },
      global: {
        type: "boolean",
        description: "Write to the global config instead of the project file",
        optional: true,
      },
    },
    readOnly: false,
    async execute(rt, { value, reset, global: globalScope }) {
      const scope = globalScope === true ? "global" : undefined;

      if (reset) {
        const written = writeConfig(rt.cwd, { channel: undefined }, scope);
        return { data: { channel: "normal", action: "reset", path: written } };
      }

      if (value) {
        const channel = validateChannel(value as string);
        const written = writeConfig(rt.cwd, { channel }, scope);
        return { data: { channel, action: "set", path: written } };
      }

      const config = readConfig(rt.cwd);
      return { data: { channel: config.channel, action: "query" } };
    },
  },
];

export default specs;
