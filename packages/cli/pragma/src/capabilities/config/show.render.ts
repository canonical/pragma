/**
 * Formatters for `pragma config show` — plain, llm, json (no ink).
 *
 * Each resolved field carries a `[global]`/`[project]` origin marker so the
 * user sees which layer won; default values carry no marker. Ported from the
 * v1 config-show formatters.
 */

import type { ConfigOrigin } from "../../kernel/config/types.js";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
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

/** One resolved row: its label, value, and `[layer]` marker (blank for a default). */
type ConfigRow = readonly [label: string, value: string, marker: string];

/** The resolved rows, in display order, shared by the plain + beautified forms. */
function configRows(data: ConfigShowData): readonly ConfigRow[] {
  const { config, origins } = data;
  return [
    [
      "tier",
      config.tier ?? "(none — all tiers visible)",
      originMarker(origins.tier),
    ],
    ["channel", config.channel, originMarker(origins.channel)],
    ["detail", config.detail ?? "standard", originMarker(origins.detail)],
    ["packages", packageNames(data), originMarker(origins.packages)],
    [
      "global config",
      `${data.globalConfigPath}${data.globalExists ? "" : " (not found)"}`,
      "",
    ],
    ["project config", data.projectConfigPath ?? "(not found)", ""],
  ];
}

/**
 * Render `config show` as plain text.
 *
 * @param data - The resolved config-show payload.
 * @param style - TTY styling; defaults to the process style. On a color-capable
 *   terminal the `key:` column is aligned + dim, values cyan, and `[layer]`
 *   markers dim; off a TTY the styler is inert, so the output is byte-identical
 *   to the pre-beautify `key: value[marker]` form.
 * @returns The formatted config block.
 */
export function renderConfigShowPlain(
  data: ConfigShowData,
  style: RenderStyle = defaultStyle(),
): string {
  const rows = configRows(data);
  if (!style.enabled) {
    return rows
      .map(([label, value, marker]) => `${label}: ${value}${marker}`)
      .join("\n");
  }
  const keyWidth = Math.max(...rows.map(([label]) => `${label}:`.length));
  return rows
    .map(([label, value, marker]) => {
      const key = style.dim(`${label}:`.padEnd(keyWidth));
      const tail = marker ? style.dim(marker) : "";
      return `${key} ${style.cyan(value)}${tail}`;
    })
    .join("\n");
}

export const configShowFormatters: Formatters<ConfigShowData> = {
  plain(data) {
    return renderConfigShowPlain(data);
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
