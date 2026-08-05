/**
 * The MCP server `instructions` string — orientation sent ONCE in the
 * initialize handshake (not per tool call), so agents arrive oriented.
 *
 * It carries the same content the retired `llm` tool front-loaded: the
 * conventions + the discovery sequence. To guarantee it never diverges from the
 * `capabilities` tool, the WHOLE orientation — the opening line included —
 * derives from the SAME source: `CONVENTIONS` and `buildDiscoverySequence` in
 * `kernel/orientation.ts`, which this module used to reach three levels up into
 * `capabilities/capabilities/catalog.ts` for. Live
 * numbers (tier/channel/entity counts) are deliberately DROPPED (they would need
 * a store boot at handshake); agents fetch those via `info`/`config show`/
 * `sources status`. Kept short (a hard length ceiling is asserted in the test),
 * since it counts against every session's context.
 */

import { buildDiscoverySequence, CONVENTIONS } from "../../orientation.js";
import { emitSurface } from "../../spec/emitSurface.js";
import type { CapabilityModule } from "../../spec/types.js";

/** Hard ceiling on the instructions length (asserted by the protected test). */
export const INSTRUCTIONS_MAX_CHARS = 1500;

/**
 * Build the handshake orientation string from the live capability modules.
 *
 * @param modules - The capability modules (for the live discovery-sample list).
 * @returns A short, single-source orientation string (≤ {@link INSTRUCTIONS_MAX_CHARS}).
 */
export function buildInstructions(
  modules: readonly CapabilityModule[],
): string {
  // Tools AND resource templates come from the one emitted surface: the
  // `<scheme>:{+uri}` template is declared by the module that serves it and
  // frozen in the covenant, so quoting it here rather than deriving it would be
  // a second copy of a string the kernel does not own.
  const { tools, resources } = emitSurface(modules).mcpSurface;
  const steps = buildDiscoverySequence(tools)
    .map((stage) => `${stage.stage}. ${stage.tool} — ${stage.purpose}`)
    .join("\n");
  const templates = resources.map((template) => `\`${template}\``).join(", ");

  return [
    `${CONVENTIONS.system} ${CONVENTIONS.model} ${CONVENTIONS.querying} ${CONVENTIONS.mutations}`,
    "",
    "Discovery sequence:",
    steps,
    "",
    `Call the \`capabilities\` tool for the full annotated tool catalog; read ${templates} resources (or \`graph_inspect\`) for entity detail.`,
  ].join("\n");
}
