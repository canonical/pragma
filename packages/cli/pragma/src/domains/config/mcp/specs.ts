/**
 * MCP tool specs for the config domain.
 *
 * config_show uses the shared resolveConfigShow() operation so that
 * MCP data matches what the CLI produces (tierChain, includedReleases, etc.).
 */

import { readConfig, writeConfig } from "#config";
import { detectInstallSource } from "#package-manager";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { showFormatters } from "../formatters/index.js";
import {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "config_show",
    description:
      "Show current pragma configuration (tier and channel settings).",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const install = detectInstallSource();
      const data = resolveConfigShow(rt.config, {
        packageManager: install.packageManager,
        installSource: install.label,
        configFilePath: "pragma.config.json",
        configFileExists: true,
      });

      if (condensed) {
        const text = showFormatters.llm(data);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data };
    },
  },
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
    },
    readOnly: false,
    async execute(rt, { path, reset }) {
      if (reset) {
        writeConfig(rt.cwd, { tier: undefined });
        return { data: { tier: null, action: "reset" } };
      }

      if (path) {
        await validateTier(rt.store, path as string);
        writeConfig(rt.cwd, { tier: path as string });
        return { data: { tier: path, action: "set" } };
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
    },
    readOnly: false,
    async execute(rt, { value, reset }) {
      if (reset) {
        writeConfig(rt.cwd, { channel: undefined });
        return { data: { channel: "normal", action: "reset" } };
      }

      if (value) {
        const channel = validateChannel(value as string);
        writeConfig(rt.cwd, { channel });
        return { data: { channel, action: "set" } };
      }

      const config = readConfig(rt.cwd);
      return { data: { channel: config.channel, action: "query" } };
    },
  },
];

export default specs;
