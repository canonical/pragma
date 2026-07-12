import type { Formatters } from "../../shared/formatters.js";
import type { ConfigShowData } from "../operations/types.js";

/**
 * Formatters for `pragma config show` output.
 *
 * - **plain** renders tier chain, channel, package manager, and config path.
 * - **llm** renders a markdown section with bullet points.
 * - **json** serializes the raw ConfigShowData.
 */
/** Render a `[layer]` marker for values a config file supplied. */
function originMarker(origin: "default" | "global" | "project"): string {
  return origin === "default" ? "" : ` [${origin}]`;
}

const formatters: Formatters<ConfigShowData> = {
  plain(data) {
    const lines: string[] = [];

    if (data.tier !== undefined) {
      const chain = data.tierChain.join(" → ");
      lines.push(
        `tier: ${data.tier} (${chain})${originMarker(data.origins.tier)}`,
      );
    } else {
      lines.push("tier: (none — all tiers visible)");
    }

    const releases = data.includedReleases.join(" + ");
    lines.push(
      `channel: ${data.channel} (${releases})${originMarker(data.origins.channel)}`,
    );
    lines.push(`installed via: ${data.installSource}`);

    if (data.configFileExists) {
      lines.push(`config file: ${data.configFilePath}`);
    } else {
      lines.push("config file: (not found)");
    }
    if (data.globalConfigExists) {
      lines.push(`global config: ${data.globalConfigPath}`);
    } else {
      lines.push("global config: (not found)");
    }

    return lines.join("\n");
  },

  llm(data) {
    const lines: string[] = [];

    lines.push("## Configuration");
    lines.push("");

    if (data.tier !== undefined) {
      const chain = data.tierChain.join(" > ");
      lines.push(
        `- **Tier:** ${data.tier} (${chain})${originMarker(data.origins.tier)}`,
      );
    } else {
      lines.push("- **Tier:** none (all tiers visible)");
    }

    const releases = data.includedReleases.join(", ");
    lines.push(
      `- **Channel:** ${data.channel} (${releases})${originMarker(data.origins.channel)}`,
    );
    lines.push(`- **Installed via:** ${data.installSource}`);

    if (data.configFileExists) {
      lines.push(`- **Config file:** \`${data.configFilePath}\``);
    } else {
      lines.push("- **Config file:** not found");
    }
    if (data.globalConfigExists) {
      lines.push(`- **Global config:** \`${data.globalConfigPath}\``);
    } else {
      lines.push("- **Global config:** not found");
    }

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
