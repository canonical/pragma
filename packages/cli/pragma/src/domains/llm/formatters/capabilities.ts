import type { CapabilitiesData } from "../types.js";

/**
 * Render capabilities data as compact terminal text.
 *
 * @param data - The structured capabilities payload.
 * @returns Plain text for terminal output.
 */
export default function renderCapabilities(data: CapabilitiesData): string {
  const lines: string[] = [];

  lines.push(`pragma v${data.version}`);
  lines.push("");

  // — Conventions
  lines.push("Conventions");
  lines.push(`  ${data.conventions.system}`);
  lines.push(`  ${data.conventions.model}`);
  lines.push(`  ${data.conventions.querying}`);
  lines.push("");

  // — Discovery sequence
  lines.push("Discovery Sequence");
  for (const stage of data.discovery_sequence) {
    lines.push(`  ${stage.stage}. ${stage.tool} — ${stage.purpose}`);
  }
  lines.push("");

  // — Tools by category
  const categories = ["read", "write", "orientation", "diagnostic"] as const;
  for (const cat of categories) {
    const tools = data.tools.filter((t) => t.category === cat);
    lines.push(`${cat} (${tools.length})`);
    for (const tool of tools) {
      lines.push(`  ${tool.name} — ${tool.use_when}`);
    }
    lines.push("");
  }

  // — Counts + limits
  const { counts } = data;
  lines.push(
    `${counts.total} tools: ${counts.read} read, ${counts.write} write, ${counts.orientation} orientation, ${counts.diagnostic} diagnostic`,
  );
  lines.push(
    `output: ${data.limits.output_modes.join(", ")} | condensed: ${data.limits.condensed_available ? "yes" : "no"}`,
  );

  return lines.join("\n");
}
