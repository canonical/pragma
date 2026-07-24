/**
 * Formatters for `pragma info` — plain, llm, json (no ink).
 */

import type { ConfigOrigin } from "../../kernel/config/types.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type { InfoData } from "./types.js";

/** A `[layer]` marker for values a config file supplied (blank for defaults). */
function originMarker(origin: ConfigOrigin): string {
  return origin === "default" ? "" : ` [${origin}]`;
}

export const infoFormatters: Formatters<InfoData> = {
  plain(data) {
    const { config } = data;
    const lines = [
      `pragma v${data.version}`,
      `  Installed via: ${data.installSource}`,
      `  tier: ${config.tier ?? "(none)"}${originMarker(config.origins.tier)}`,
      `  channel: ${config.channel}${originMarker(config.origins.channel)}`,
      `  detail: ${config.detail ?? "standard"}${originMarker(config.origins.detail)}`,
    ];
    if (data.entities !== undefined) {
      lines.push(`  entities: ${data.entities.toLocaleString()}`);
    }
    lines.push(
      "",
      "Config files:",
      `  global:  ${config.globalConfigPath}${config.globalExists ? "" : " (not found)"}`,
      `  project: ${config.projectConfigPath ?? "(none)"}${
        config.projectConfigPath && !config.projectExists ? " (not found)" : ""
      }`,
    );
    if (data.update) {
      lines.push(
        "",
        `Update available: ${data.update.current} → ${data.update.latest}`,
        `  Run: ${data.update.command}`,
      );
    }
    return lines.join("\n");
  },

  llm(data) {
    const { config } = data;
    const lines = [
      `# pragma v${data.version}`,
      `- Installed via: ${data.installSource}`,
      `- Tier: ${config.tier ?? "(none)"}${originMarker(config.origins.tier)}`,
      `- Channel: ${config.channel}${originMarker(config.origins.channel)}`,
      `- Detail: ${config.detail ?? "standard"}${originMarker(config.origins.detail)}`,
      `- Global config: ${config.globalConfigPath}`,
    ];
    if (config.projectConfigPath) {
      lines.push(`- Project config: ${config.projectConfigPath}`);
    }
    if (data.entities !== undefined) {
      lines.push(`- Entities: ${data.entities.toLocaleString()}`);
    }
    if (data.update) {
      lines.push(
        `- Update available: ${data.update.current} → ${data.update.latest} (\`${data.update.command}\`)`,
      );
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
