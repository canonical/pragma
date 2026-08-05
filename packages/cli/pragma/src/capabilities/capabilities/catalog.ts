/**
 * The SELF-UPDATING capabilities catalog.
 *
 * `buildCapabilitiesData(modules)` projects the LIVE grammar: it emits the
 * surface, walks `mcpSurface.tools` (the sorted, covenant-conformant set), and
 * annotates each tool from the authored `TOOL_HINTS` table. The tool set, the
 * category counts, and the discovery-sample list are all DERIVED — never pinned
 * — so the catalog tracks the surface automatically, which a hand-maintained
 * list does not: that is the failure mode where the catalog goes on naming
 * retired tools.
 *
 * Pure + zod-free: it reads only `emitSurface` (itself fast-path-safe), so the
 * verb's storeless guarantee holds. The conventions + discovery strings live in
 * `kernel/orientation.ts`, which `kernel/project/mcp/instructions.ts` reads
 * too, so the handshake and this payload derive from the SAME source and can
 * never diverge. They moved there from here: the handshake reaching three
 * levels up into a concrete capability was a kernel→capabilities back-edge.
 */

import { VERSION } from "../../constants.js";
import {
  buildDiscoverySequence,
  CONVENTIONS,
} from "../../kernel/orientation.js";
import { emitSurface } from "../../kernel/spec/emitSurface.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { TOOL_HINTS } from "./hints.js";
import type {
  CapabilitiesData,
  CatalogTool,
  ToolCategory,
  ToolCounts,
} from "./types.js";

/** The output modes the renderers offer. */
const OUTPUT_MODES = ["plain", "json", "llm"] as const;

/** The set of tool names that mutate, read from the emitted surface. */
function mutatingTools(modules: readonly CapabilityModule[]): Set<string> {
  const mutating = new Set<string>();
  for (const { verbs } of Object.values(emitSurface(modules).nouns)) {
    for (const verb of verbs) {
      if (verb.mutates && typeof verb.mcp === "string") mutating.add(verb.mcp);
    }
  }
  return mutating;
}

/** The live sorted tool names the covenant blesses, from the emitted surface. */
export function liveTools(modules: readonly CapabilityModule[]): string[] {
  return emitSurface(modules).mcpSurface.tools;
}

/**
 * The three tools whose category is NOT derivable, and the whole authored
 * residue of what used to be thirty-six hand-written categories.
 *
 * `write` is derived (⟺ the verb mutates) and `read` is the remainder, so the
 * only fact the surface does not carry is which non-mutating tools are the
 * session-start map and which report on the environment rather than on the
 * graph. All three are kernel verbs — they exist in every distribution, under
 * these names, whatever domain it serves — which is why naming them here is a
 * constant and not a table a fork has to maintain. A fork that adds a
 * diagnostic tool gets `read`, which is wrong-but-harmless; a fork that adds a
 * MUTATING tool gets `write`, which is the reading that matters and the one
 * that used to break.
 */
const CATEGORY_BY_KERNEL_TOOL: Readonly<Record<string, ToolCategory>> = {
  capabilities: "orientation",
  doctor: "diagnostic",
  info: "diagnostic",
};

/** Tally the catalog tools by category (all counts DERIVED, never pinned). */
function countByCategory(tools: readonly CatalogTool[]): ToolCounts {
  const of = (category: CatalogTool["category"]) =>
    tools.filter((tool) => tool.category === category).length;
  return {
    total: tools.length,
    read: of("read"),
    write: of("write"),
    orientation: of("orientation"),
    diagnostic: of("diagnostic"),
  };
}

/**
 * Build the capabilities payload from a set of capability modules.
 *
 * @param modules - The live capability modules (passed in to avoid a static
 *   self-cycle; the verb's `run` dynamic-imports the registry barrel).
 * @returns The structured, self-consistent capabilities map.
 */
export function buildCapabilitiesData(
  modules: readonly CapabilityModule[],
): CapabilitiesData {
  const tools = liveTools(modules);
  const mutating = mutatingTools(modules);
  const catalogTools: CatalogTool[] = tools.map((name) => {
    // DERIVED, not read from the hint table. `capabilities.test.ts` already
    // proved `category === "write"` iff `verb.mutates`, over every tool, so
    // the authored copy was thirty-six chances to disagree with the surface —
    // and a MISSING hint degraded to `read`, which reported a fork's every
    // mutating tool as a read and its `counts.write` as 0.
    const category: ToolCategory = mutating.has(name)
      ? "write"
      : (CATEGORY_BY_KERNEL_TOOL[name] ?? "read");
    // A missing hint is a drift bug caught by `capabilities.test.ts`; degrade
    // to a truthful placeholder rather than throwing inside a tool call. Only
    // the prose degrades now — the category cannot.
    return {
      name,
      category,
      use_when:
        TOOL_HINTS[name]?.use_when ??
        "(no hint authored — see capabilities/hints.ts)",
    };
  });

  return {
    version: VERSION,
    conventions: CONVENTIONS,
    discovery_sequence: buildDiscoverySequence(tools),
    tools: catalogTools,
    counts: countByCategory(catalogTools),
    limits: { output_modes: OUTPUT_MODES, condensed_available: false },
  };
}

export { mutatingTools };
