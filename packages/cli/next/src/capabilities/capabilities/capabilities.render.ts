/**
 * Formatters for `pragma capabilities` — plain, llm, json.
 *
 * `plain` is ported from the old shell's `renderCapabilities`; `llm` is the same
 * information as compact Markdown for agents; `json` is the raw structured map
 * (what the MCP tool returns through the envelope).
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { CapabilitiesData, ToolCategory } from "./types.js";

/** Category display order for grouped tool listings. */
const CATEGORY_ORDER: readonly ToolCategory[] = [
  "read",
  "write",
  "orientation",
  "diagnostic",
];

export const capabilitiesFormatters: Formatters<CapabilitiesData> = {
  plain(data) {
    const lines: string[] = [`pragma v${data.version}`, ""];

    lines.push("Conventions");
    lines.push(`  ${data.conventions.system}`);
    lines.push(`  ${data.conventions.model}`);
    lines.push(`  ${data.conventions.querying}`);
    lines.push("");

    lines.push("Discovery Sequence");
    for (const stage of data.discovery_sequence) {
      lines.push(`  ${stage.stage}. ${stage.tool} — ${stage.purpose}`);
    }
    lines.push("");

    for (const category of CATEGORY_ORDER) {
      const tools = data.tools.filter((tool) => tool.category === category);
      lines.push(`${category} (${tools.length})`);
      for (const tool of tools) {
        lines.push(`  ${tool.name} — ${tool.use_when}`);
      }
      lines.push("");
    }

    const { counts } = data;
    lines.push(
      `${counts.total} tools: ${counts.read} read, ${counts.write} write, ${counts.orientation} orientation, ${counts.diagnostic} diagnostic`,
    );
    lines.push(
      `output: ${data.limits.output_modes.join(", ")} | condensed: ${data.limits.condensed_available ? "yes" : "no"}`,
    );
    return lines.join("\n");
  },

  llm(data) {
    const lines: string[] = [`# pragma v${data.version}`, ""];

    lines.push("## Conventions");
    lines.push(`- ${data.conventions.system}`);
    lines.push(`- ${data.conventions.model}`);
    lines.push(`- ${data.conventions.querying}`);
    lines.push("");

    lines.push("## Discovery sequence");
    for (const stage of data.discovery_sequence) {
      lines.push(`${stage.stage}. \`${stage.tool}\` — ${stage.purpose}`);
    }
    lines.push("");

    for (const category of CATEGORY_ORDER) {
      const tools = data.tools.filter((tool) => tool.category === category);
      lines.push(`## ${category} (${tools.length})`);
      for (const tool of tools) {
        lines.push(`- \`${tool.name}\` — ${tool.use_when}`);
      }
      lines.push("");
    }

    const { counts } = data;
    lines.push(
      `${counts.total} tools: ${counts.read} read, ${counts.write} write, ${counts.orientation} orientation, ${counts.diagnostic} diagnostic.`,
    );
    return lines.join("\n").trimEnd();
  },

  json(data) {
    return JSON.stringify(data);
  },
};
