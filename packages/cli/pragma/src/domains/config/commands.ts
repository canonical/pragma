/**
 * Config command definitions.
 *
 * `pragma config tier <path>` — set/reset tier
 * `pragma config channel <value>` — set/reset channel
 * `pragma config show` — display resolved configuration
 *
 * @see CF.03, CF.04 in B.08.CONFIG
 */

import type { CommandDefinition } from "@canonical/cli-core";
import { createOutputResult } from "@canonical/cli-core";
import {
  configExists,
  readConfig,
  resolveConfigPath,
  writeConfig,
} from "../../config.js";
import { detectPackageManager } from "../../pm.js";
import { bootStore } from "../shared/bootStore.js";
import type { ConfigShowData } from "./operations.js";
import {
  resolveConfigShow,
  validateChannel,
  validateTier,
} from "./operations.js";

// =============================================================================
// Renderers
// =============================================================================

function renderConfigSetPlain(field: string, value: string): string {
  return `Set ${field} to "${value}".`;
}

function renderConfigResetPlain(field: string): string {
  return `Reset ${field} to default.`;
}

function renderConfigShowPlain(data: ConfigShowData): string {
  const lines: string[] = [];

  if (data.tier !== undefined) {
    const chain = data.tierChain.join(" → ");
    lines.push(`tier: ${data.tier} (${chain})`);
  } else {
    lines.push("tier: (none — all tiers visible)");
  }

  const releases = data.includedReleases.join(" + ");
  lines.push(`channel: ${data.channel} (${releases})`);
  lines.push(`installed via: ${data.packageManager}`);

  if (data.configFileExists) {
    lines.push(`config file: ${data.configFilePath}`);
  } else {
    lines.push("config file: (not found)");
  }

  return lines.join("\n");
}

// =============================================================================
// Commands
// =============================================================================

const configTierCommand: CommandDefinition = {
  path: ["config", "tier"],
  description: "Set or reset the active tier",
  parameters: [
    {
      name: "path",
      description: "Tier path (e.g., global, apps, apps/lxd)",
      type: "string",
      positional: true,
    },
    {
      name: "reset",
      description: "Reset tier to default (all tiers visible)",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: ["pragma config tier apps/lxd", "pragma config tier --reset"],
  },
  execute: async (params, ctx) => {
    const reset = params.reset === true;
    const tierPath = params.path as string | undefined;

    if (reset) {
      writeConfig(ctx.cwd, { tier: undefined });
      const msg = "Reset tier to default.";
      return createOutputResult(msg, {
        plain: () => renderConfigResetPlain("tier"),
      });
    }

    if (!tierPath) {
      const config = readConfig(ctx.cwd);
      if (config.tier !== undefined) {
        return createOutputResult(config.tier, {
          plain: (v) => `Current tier: ${v}`,
        });
      }
      return createOutputResult("(none)", {
        plain: () => "No tier set (all tiers visible).",
      });
    }

    // Validate tier against ontology
    const store = await bootStore({ cwd: ctx.cwd });
    await validateTier(store, tierPath);

    writeConfig(ctx.cwd, { tier: tierPath });
    return createOutputResult(
      { field: "tier", value: tierPath },
      {
        plain: (d) => renderConfigSetPlain(d.field, d.value),
      },
    );
  },
};

const configChannelCommand: CommandDefinition = {
  path: ["config", "channel"],
  description: "Set or reset the release channel",
  parameters: [
    {
      name: "value",
      description: "Channel (normal, experimental, prerelease)",
      type: "string",
      positional: true,
    },
    {
      name: "reset",
      description: "Reset channel to normal",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma config channel experimental",
      "pragma config channel --reset",
    ],
  },
  execute: async (params, ctx) => {
    const reset = params.reset === true;
    const value = params.value as string | undefined;

    if (reset) {
      writeConfig(ctx.cwd, { channel: undefined });
      return createOutputResult("Reset channel to default.", {
        plain: () => renderConfigResetPlain("channel"),
      });
    }

    if (!value) {
      const config = readConfig(ctx.cwd);
      return createOutputResult(config.channel, {
        plain: (v) => `Current channel: ${v}`,
      });
    }

    const channel = validateChannel(value);

    writeConfig(ctx.cwd, { channel });
    return createOutputResult(
      { field: "channel", value: channel },
      {
        plain: (d) => renderConfigSetPlain(d.field, d.value),
      },
    );
  },
};

const configShowCommand: CommandDefinition = {
  path: ["config", "show"],
  description: "Display resolved configuration",
  parameters: [],
  meta: {
    examples: ["pragma config show"],
  },
  execute: async (_params, ctx) => {
    const config = readConfig(ctx.cwd);
    const store = await bootStore({ cwd: ctx.cwd });
    const pm = detectPackageManager();
    const cfgPath = resolveConfigPath(ctx.cwd);
    const cfgExists = configExists(ctx.cwd);

    const data = await resolveConfigShow(store, config, {
      cwd: ctx.cwd,
      packageManager: pm,
      configFilePath: cfgPath,
      configFileExists: cfgExists,
    });

    return createOutputResult(data, {
      plain: renderConfigShowPlain,
    });
  },
};

function collectConfigCommands(): CommandDefinition[] {
  return [configTierCommand, configChannelCommand, configShowCommand];
}

export { collectConfigCommands };
