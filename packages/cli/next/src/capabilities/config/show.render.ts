/**
 * Formatters for `pragma config show` — plain, llm, json (no ink).
 *
 * Each resolved field carries a `[global]`/`[project]` origin marker so the
 * user sees which layer won; default values carry no marker. Ported from the
 * v1 config-show formatters.
 */

import type { ConfigOrigin } from "../../kernel/config/types.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type { ConfigShowData } from "./types.js";

/** A `[layer]` marker for values a config file supplied (blank for defaults). */
function originMarker(origin: ConfigOrigin): string {
  return origin === "default" ? "" : ` [${origin}]`;
}

/** Summarize the `packages` list as a comma-separated set of names. */
function packageNames(data: ConfigShowData): string {
  const packages = data.config.packages ?? [];
  const names = packages.map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  );
  return names.length > 0 ? names.join(", ") : "(none)";
}

export const configShowFormatters: Formatters<ConfigShowData> = {
  plain(data) {
    const { config, origins } = data;
    const lines = [
      `tier: ${config.tier ?? "(none — all tiers visible)"}${originMarker(origins.tier)}`,
      `channel: ${config.channel}${originMarker(origins.channel)}`,
      `detail: ${config.detail ?? "standard"}${originMarker(origins.detail)}`,
      `packages: ${packageNames(data)}${originMarker(origins.packages)}`,
      `global config: ${data.globalConfigPath}${data.globalExists ? "" : " (not found)"}`,
      `project config: ${data.projectConfigPath ?? "(not found)"}`,
    ];
    return lines.join("\n");
  },

  llm(data) {
    const { config, origins } = data;
    const lines = [
      "## Configuration",
      "",
      `- **Tier:** ${config.tier ?? "none (all tiers)"}${originMarker(origins.tier)}`,
      `- **Channel:** ${config.channel}${originMarker(origins.channel)}`,
      `- **Detail:** ${config.detail ?? "standard"}${originMarker(origins.detail)}`,
      `- **Packages:** ${packageNames(data)}${originMarker(origins.packages)}`,
      `- **Global config:** \`${data.globalConfigPath}\``,
    ];
    if (data.projectConfigPath) {
      lines.push(`- **Project config:** \`${data.projectConfigPath}\``);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
