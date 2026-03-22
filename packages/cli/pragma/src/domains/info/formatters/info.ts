import chalk from "chalk";
import { formatField, formatHeading } from "#pipeline";
import type { InfoData } from "../types.js";

/**
 * Renders `pragma info` output for a plain terminal.
 *
 * Includes chalk-styled version, config, update status, and store summary.
 *
 * @param data - The collected info data.
 * @returns A formatted terminal string.
 */
function renderInfoPlain(data: InfoData): string {
  const lines: string[] = [];

  lines.push(`pragma v${data.version}`);

  lines.push(formatField("  Installed via:", data.installSource));

  lines.push(formatField("  Config:", data.configPath));

  if (data.tier) {
    const chain = data.tierChain.join(" → ");
    lines.push(formatField("    tier:", `${data.tier} (${chain})`));
  } else {
    lines.push(formatField("    tier:", "(none)"));
  }

  const releases = data.channelReleases.join(", ");
  lines.push(formatField("    channel:", `${data.channel} (${releases})`));

  lines.push("");
  lines.push(formatHeading("Update"));
  if (data.update) {
    lines.push(
      `  ${data.update.current} → ${chalk.green(data.update.latest)} available`,
    );
    lines.push(`  Run ${chalk.cyan(`\`${data.update.command}\``)} to upgrade.`);
    lines.push(`  Or run ${chalk.cyan("`pragma upgrade`")}.`);
  } else if (data.updateSkipped) {
    lines.push("  Upgrade check skipped (offline)");
  } else {
    lines.push("  Up to date.");
  }

  if (data.store) {
    lines.push("");
    lines.push(formatHeading("Store"));
    lines.push(
      formatField("  Triples:", data.store.tripleCount.toLocaleString()),
    );
    if (data.store.graphNames.length > 0) {
      lines.push(
        formatField(
          "  Graphs:",
          `default, ${data.store.graphNames.join(", ")}`,
        ),
      );
    } else {
      lines.push(formatField("  Graphs:", "default"));
    }
  }

  return lines.join("\n");
}

/**
 * Renders `pragma info` output as condensed Markdown for LLM consumption.
 *
 * @param data - The collected info data.
 * @returns A Markdown string.
 */
function renderInfoLlm(data: InfoData): string {
  const lines: string[] = [];

  lines.push(`# pragma v${data.version}`);
  lines.push(`- Installed via: ${data.installSource}`);

  if (data.tier) {
    lines.push(`- Tier: ${data.tier} (${data.tierChain.join(" → ")})`);
  } else {
    lines.push("- Tier: (none)");
  }
  lines.push(`- Channel: ${data.channel} (${data.channelReleases.join(", ")})`);

  if (data.update) {
    lines.push(
      `- Update: ${data.update.current} → ${data.update.latest} available`,
    );
  } else if (data.updateSkipped) {
    lines.push("- Update: check skipped (offline)");
  } else {
    lines.push("- Update: up to date");
  }

  if (data.store) {
    lines.push(`- Store: ${data.store.tripleCount.toLocaleString()} triples`);
    if (data.store.graphNames.length > 0) {
      lines.push(`- Graphs: default, ${data.store.graphNames.join(", ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Renders `pragma info` output as indented JSON.
 *
 * @param data - The collected info data.
 * @returns A JSON string.
 */
function renderInfoJson(data: InfoData): string {
  return JSON.stringify(data, null, 2);
}

export { renderInfoJson, renderInfoLlm, renderInfoPlain };
