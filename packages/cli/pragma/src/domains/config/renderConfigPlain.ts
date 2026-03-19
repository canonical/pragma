/**
 * Plain-text renderers for config command output.
 */

import type { ConfigShowData } from "./operations.js";

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

export { renderConfigResetPlain, renderConfigSetPlain, renderConfigShowPlain };
