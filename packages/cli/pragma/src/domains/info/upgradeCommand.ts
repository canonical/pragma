/**
 * `pragma upgrade` command definition.
 *
 * Upgrades the pragma CLI via the detected package manager.
 *
 * @note Impure — detects PM, queries registry, spawns child process.
 * @see IN.05, IN.06, IN.08 in B.11.INSTALL
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { readConfig } from "../../config.js";
import { VERSION } from "../../constants.js";
import { PragmaError } from "../../error/index.js";
import { detectPackageManager, PM_COMMANDS } from "../../pm.js";
import { checkRegistryVersion } from "./checkRegistryVersion.js";

interface UpgradeData {
  readonly pm: string;
  readonly current: string;
  readonly latest: string | undefined;
  readonly command: string;
  readonly dryRun: boolean;
  readonly alreadyLatest: boolean;
  readonly offline: boolean;
  readonly executed: boolean;
}

function renderUpgradePlain(data: UpgradeData): string {
  const lines: string[] = [];

  lines.push(`Installed via: ${data.pm} (global)`);

  if (data.offline) {
    lines.push("Could not reach registry");
    return lines.join("\n");
  }

  if (data.alreadyLatest) {
    lines.push(`Already at latest version (${data.current}).`);
    return lines.join("\n");
  }

  lines.push("");
  lines.push(
    `@canonical/pragma  ${data.current} → ${chalk.green(data.latest)}`,
  );
  lines.push("");

  if (data.dryRun) {
    lines.push(`Would run: ${chalk.cyan(data.command)}`);
  } else {
    lines.push(`Running: ${chalk.cyan(data.command)}`);
    lines.push("");
    lines.push(`done. Updated to ${data.latest}.`);
  }

  return lines.join("\n");
}

function renderUpgradeLlm(data: UpgradeData): string {
  if (data.offline) return "Upgrade check failed: could not reach registry";
  if (data.alreadyLatest) return `Already at latest version (${data.current})`;
  if (data.dryRun)
    return `Would upgrade: ${data.current} → ${data.latest}\nCommand: ${data.command}`;
  return `Upgraded: ${data.current} → ${data.latest}`;
}

function renderUpgradeJson(data: UpgradeData): string {
  return JSON.stringify(data, null, 2);
}

async function executeUpgrade(
  params: Record<string, unknown>,
  ctx: { cwd: string; globalFlags: { llm: boolean; format: "text" | "json" } },
): Promise<CommandResult> {
  const dryRun = params.dryRun === true;
  const pm = detectPackageManager();
  const config = readConfig(ctx.cwd);
  const command = PM_COMMANDS[pm].update("@canonical/pragma");

  // Registry check (IN.08)
  const registryResult = await checkRegistryVersion(
    "@canonical/pragma",
    config.channel,
  );

  if (!registryResult) {
    const data: UpgradeData = {
      pm,
      current: VERSION,
      latest: undefined,
      command,
      dryRun,
      alreadyLatest: false,
      offline: true,
      executed: false,
    };

    return {
      tag: "output",
      value: data,
      render: {
        plain: (d: UpgradeData) => {
          if (ctx.globalFlags.format === "json") return renderUpgradeJson(d);
          if (ctx.globalFlags.llm) return renderUpgradeLlm(d);
          return renderUpgradePlain(d);
        },
      },
    };
  }

  if (registryResult.latest === VERSION) {
    const data: UpgradeData = {
      pm,
      current: VERSION,
      latest: registryResult.latest,
      command,
      dryRun,
      alreadyLatest: true,
      offline: false,
      executed: false,
    };

    return {
      tag: "output",
      value: data,
      render: {
        plain: (d: UpgradeData) => {
          if (ctx.globalFlags.format === "json") return renderUpgradeJson(d);
          if (ctx.globalFlags.llm) return renderUpgradeLlm(d);
          return renderUpgradePlain(d);
        },
      },
    };
  }

  let executed = false;
  if (!dryRun) {
    try {
      execSync(command, { stdio: "inherit" });
      executed = true;
    } catch (error) {
      throw PragmaError.internalError(
        `Upgrade command failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const data: UpgradeData = {
    pm,
    current: VERSION,
    latest: registryResult.latest,
    command,
    dryRun,
    alreadyLatest: false,
    offline: false,
    executed,
  };

  return {
    tag: "output",
    value: data,
    render: {
      plain: (d: UpgradeData) => {
        if (ctx.globalFlags.format === "json") return renderUpgradeJson(d);
        if (ctx.globalFlags.llm) return renderUpgradeLlm(d);
        return renderUpgradePlain(d);
      },
    },
  };
}

const upgradeCommand: CommandDefinition = {
  path: ["upgrade"],
  description: "Upgrade the pragma CLI to the latest version",
  parameters: [
    {
      name: "dryRun",
      description: "Show what would happen without running the upgrade",
      type: "boolean",
      default: false,
    },
  ],
  execute: executeUpgrade,
};

export {
  upgradeCommand,
  renderUpgradeJson,
  renderUpgradeLlm,
  renderUpgradePlain,
};
export type { UpgradeData };
