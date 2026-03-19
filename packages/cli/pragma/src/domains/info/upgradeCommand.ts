/**
 * `pragma upgrade` command definition.
 *
 * Upgrades the pragma CLI via the detected package manager.
 *
 * @note Impure — detects PM, queries registry, spawns child process.
 * @see IN.05, IN.06, IN.08 in B.11.INSTALL
 */

import { execSync } from "node:child_process";
import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import { readConfig } from "../../config.js";
import { VERSION } from "../../constants.js";
import { PragmaError } from "../../error/index.js";
import { detectPackageManager, PM_COMMANDS } from "../../pm.js";
import checkRegistryVersion from "./checkRegistryVersion.js";
import {
  renderUpgradeJson,
  renderUpgradeLlm,
  renderUpgradePlain,
} from "./renderUpgrade.js";
import type { UpgradeData } from "./types.js";

function selectUpgradeRenderer(flags: {
  llm: boolean;
  format: "text" | "json";
}): (data: UpgradeData) => string {
  if (flags.format === "json") return renderUpgradeJson;
  if (flags.llm) return renderUpgradeLlm;
  return renderUpgradePlain;
}

function buildUpgradeResult(
  data: UpgradeData,
  flags: { llm: boolean; format: "text" | "json" },
): CommandResult {
  const render = selectUpgradeRenderer(flags);
  return { tag: "output", value: data, render: { plain: render } };
}

async function executeUpgrade(
  params: Record<string, unknown>,
  ctx: { cwd: string; globalFlags: { llm: boolean; format: "text" | "json" } },
): Promise<CommandResult> {
  const dryRun = params.dryRun === true;
  const pm = detectPackageManager();
  const config = readConfig(ctx.cwd);
  const command = PM_COMMANDS[pm].update("@canonical/pragma");

  const registryResult = await checkRegistryVersion(
    "@canonical/pragma",
    config.channel,
  );

  if (!registryResult) {
    return buildUpgradeResult(
      {
        pm,
        current: VERSION,
        latest: undefined,
        command,
        dryRun,
        alreadyLatest: false,
        offline: true,
        executed: false,
      },
      ctx.globalFlags,
    );
  }

  if (registryResult.latest === VERSION) {
    return buildUpgradeResult(
      {
        pm,
        current: VERSION,
        latest: registryResult.latest,
        command,
        dryRun,
        alreadyLatest: true,
        offline: false,
        executed: false,
      },
      ctx.globalFlags,
    );
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

  return buildUpgradeResult(
    {
      pm,
      current: VERSION,
      latest: registryResult.latest,
      command,
      dryRun,
      alreadyLatest: false,
      offline: false,
      executed,
    },
    ctx.globalFlags,
  );
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

export default upgradeCommand;
