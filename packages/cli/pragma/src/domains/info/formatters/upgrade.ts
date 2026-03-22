import chalk from "chalk";
import type { UpgradeData } from "../types.js";

/**
 * Renders `pragma upgrade` output for a plain terminal.
 *
 * Shows version comparison, dry-run notice, or completion status with chalk styling.
 *
 * @param data - The upgrade outcome data.
 * @returns A formatted terminal string.
 */
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

/**
 * Renders `pragma upgrade` output as condensed Markdown for LLM consumption.
 *
 * @param data - The upgrade outcome data.
 * @returns A single-line Markdown string.
 */
function renderUpgradeLlm(data: UpgradeData): string {
  if (data.offline) return "Upgrade check failed: could not reach registry";
  if (data.alreadyLatest) return `Already at latest version (${data.current})`;
  if (data.dryRun)
    return `Would upgrade: ${data.current} → ${data.latest}\nCommand: ${data.command}`;
  return `Upgraded: ${data.current} → ${data.latest}`;
}

/**
 * Renders `pragma upgrade` output as indented JSON.
 *
 * @param data - The upgrade outcome data.
 * @returns A JSON string.
 */
function renderUpgradeJson(data: UpgradeData): string {
  return JSON.stringify(data, null, 2);
}

export { renderUpgradeJson, renderUpgradeLlm, renderUpgradePlain };
