/**
 * Formatters for `pragma info` — plain, llm, json (no ink).
 */

import { BIN_NAME } from "../../constants.js";
import type { Formatters } from "../../kernel/spec/types.js";
import { renderOriginMarker } from "../shared/originMarker.js";
import type { InfoData } from "./types.js";

export const infoFormatters: Formatters<InfoData> = {
  plain(data) {
    const { config } = data;
    const lines = [
      `${BIN_NAME} v${data.version}`,
      `  Installed via: ${data.installSource}`,
      `  tier: ${config.tier ?? "(none)"}${renderOriginMarker(config.origins.tier)}`,
      `  channel: ${config.channel}${renderOriginMarker(config.origins.channel)}`,
      `  detail: ${config.detail ?? "standard"}${renderOriginMarker(config.origins.detail)}`,
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
      `# ${BIN_NAME} v${data.version}`,
      `- Installed via: ${data.installSource}`,
      `- Tier: ${config.tier ?? "(none)"}${renderOriginMarker(config.origins.tier)}`,
      `- Channel: ${config.channel}${renderOriginMarker(config.origins.channel)}`,
      `- Detail: ${config.detail ?? "standard"}${renderOriginMarker(config.origins.detail)}`,
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
