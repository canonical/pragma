/**
 * MCP tool specs for the config domain — config_show, config_tier,
 * config_channel, config_detail.
 *
 * config_show is compiled from the config read story in `../stories.ts`
 * so both surfaces share resolution and formatters; the mutating tier,
 * channel, and detail tools are spec'd by hand.
 */

import { readConfig, writeConfig } from "#config";
import { compileReadTool } from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  validateChannel,
  validateDetail,
  validateTier,
} from "../operations/index.js";
import { configShowStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(configShowStory),
  {
    name: "config_tier",
    description:
      "Set or reset the active tier filter (persisted in config). Pass a " +
      "tier path to set, or reset=true to clear. Use when the durable scope " +
      "should change — prefer allTiers: true per call for one-off wide " +
      "queries, since config changes persist for the human too. Example: " +
      'config_tier { path: "apps/lxd" }.',
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
      "Set or reset the release channel (persisted in config). Pass a value " +
      "to set, or reset=true to clear. Use when experimental or prerelease " +
      "entities should become visible to lists and lookups. Example: " +
      'config_channel { value: "experimental" }.',
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
  {
    name: "config_detail",
    description:
      "Set or reset the default disclosure level for lookups (persisted in config). " +
      "Use when a deeper or shallower default should stick across calls — prefer the " +
      "per-call detail param for one-off queries, since config changes persist for the " +
      'human too. Example: config_detail { level: "digest" }.',
    params: {
      level: {
        type: "string",
        description:
          "Disclosure level (pack-defined; e.g. summary, digest, detailed)",
        optional: true,
      },
      reset: {
        type: "boolean",
        description: "Reset detail to default (per-surface defaults apply)",
        optional: true,
      },
      global: {
        type: "boolean",
        description: "Write to the global config instead of the project file",
        optional: true,
      },
    },
    readOnly: false,
    async execute(rt, { level, reset, global: globalScope }) {
      const scope = globalScope === true ? "global" : undefined;

      if (reset) {
        const written = writeConfig(rt.cwd, { detail: undefined }, scope);
        return { data: { detail: null, action: "reset", path: written } };
      }

      if (level) {
        const detail = validateDetail(level as string);
        const written = writeConfig(rt.cwd, { detail }, scope);
        return { data: { detail, action: "set", path: written } };
      }

      const config = readConfig(rt.cwd);
      return { data: { detail: config.detail ?? null, action: "query" } };
    },
  },
];

export default specs;
