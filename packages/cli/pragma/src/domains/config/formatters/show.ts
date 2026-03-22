import type { Formatters } from "../../shared/formatters.js";
import type { ConfigShowData } from "../operations/types.js";

/**
 * Formatters for `pragma config show` output.
 *
 * - **plain** renders tier chain, channel, package manager, and config path.
 * - **llm** renders a markdown section with bullet points.
 * - **json** serializes the raw ConfigShowData.
 */
const formatters: Formatters<ConfigShowData> = {
  plain(data) {
    const lines: string[] = [];

    if (data.tier !== undefined) {
      const chain = data.tierChain.join(" → ");
      lines.push(`tier: ${data.tier} (${chain})`);
    } else {
      lines.push("tier: (none — all tiers visible)");
    }

    const releases = data.includedReleases.join(" + ");
    lines.push(`channel: ${data.channel} (${releases})`);
    lines.push(`installed via: ${data.installSource}`);

    if (data.configFileExists) {
      lines.push(`config file: ${data.configFilePath}`);
    } else {
      lines.push("config file: (not found)");
    }

    return lines.join("\n");
  },

  llm(data) {
    const lines: string[] = [];

    lines.push("## Configuration");
    lines.push("");

    if (data.tier !== undefined) {
      const chain = data.tierChain.join(" > ");
      lines.push(`- **Tier:** ${data.tier} (${chain})`);
    } else {
      lines.push("- **Tier:** none (all tiers visible)");
    }

    const releases = data.includedReleases.join(", ");
    lines.push(`- **Channel:** ${data.channel} (${releases})`);
    lines.push(`- **Installed via:** ${data.installSource}`);

    if (data.configFileExists) {
      lines.push(`- **Config file:** \`${data.configFilePath}\``);
    } else {
      lines.push("- **Config file:** not found");
    }

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;
