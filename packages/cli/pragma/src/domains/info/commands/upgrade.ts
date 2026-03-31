import { execSync } from "node:child_process";
import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import { readConfig } from "#config";
import { VERSION } from "#constants";
import { PragmaError } from "#error";
import { detectInstallSource, PM_COMMANDS } from "#package-manager";
import {
  renderUpgradeJson,
  renderUpgradeLlm,
  renderUpgradePlain,
} from "../formatters/index.js";
import checkRegistryVersion from "../operations/checkRegistryVersion.js";
import type { UpgradeData } from "../types.js";

/**
 * Selects the appropriate upgrade renderer based on global CLI flags.
 *
 * @param flags - Global flags indicating output format.
 * @returns A render function mapping {@link UpgradeData} to a string.
 */
function selectUpgradeRenderer(flags: {
  llm: boolean;
  format: "text" | "json";
}): (data: UpgradeData) => string {
  if (flags.format === "json") return renderUpgradeJson;
  if (flags.llm) return renderUpgradeLlm;
  return renderUpgradePlain;
}

/**
 * Wraps upgrade data in a command result with the selected renderer.
 *
 * @param data - The upgrade outcome data.
 * @param flags - Global flags indicating output format.
 * @returns A command result ready for display.
 */
function buildUpgradeResult(
  data: UpgradeData,
  flags: { llm: boolean; format: "text" | "json" },
): CommandResult {
  const render = selectUpgradeRenderer(flags);
  return { tag: "output", value: data, render: { plain: render } };
}

/**
 * Executes the upgrade workflow: checks the registry, optionally runs the
 * package-manager update command, and returns the result.
 *
 * @note Impure
 *
 * @param params - Command parameters (`dryRun` boolean).
 * @param ctx - Execution context with `cwd` and `globalFlags`.
 * @returns A command result describing the upgrade outcome.
 * @throws PragmaError if the upgrade shell command fails.
 */
async function executeUpgrade(
  params: Record<string, unknown>,
  ctx: { cwd: string; globalFlags: { llm: boolean; format: "text" | "json" } },
): Promise<CommandResult> {
  const dryRun = params.dryRun === true;
  const source = detectInstallSource();
  const pm = source.label;
  const config = readConfig(ctx.cwd);
  const command = PM_COMMANDS[source.packageManager].update(
    "@canonical/pragma-cli",
  );

  const registryResult = await checkRegistryVersion(
    "@canonical/pragma-cli",
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

/**
 * The `pragma upgrade` command definition.
 *
 * Upgrades the pragma CLI to the latest version via the detected package manager.
 *
 * @note Impure
 */
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
