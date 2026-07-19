/**
 * The MCP server `instructions` string — orientation sent ONCE in the
 * initialize handshake (not per tool call), so agents arrive oriented.
 *
 * It carries the same content the retired `llm` tool front-loaded: the
 * conventions + the discovery sequence. To guarantee it never diverges from the
 * `capabilities` tool, it derives BOTH from the SAME source — `CONVENTIONS` and
 * `buildDiscoverySequence` in `capabilities/capabilities/catalog.ts`. Live
 * numbers (tier/channel/entity counts) are deliberately DROPPED (they would need
 * a store boot at handshake); agents fetch those via `info`/`config show`/
 * `sources status`. Kept short (a hard length ceiling is asserted in the test),
 * since it counts against every session's context.
 */

import {
  buildDiscoverySequence,
  CONVENTIONS,
  liveTools,
} from "../../../capabilities/capabilities/catalog.js";
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
  const discovery = buildDiscoverySequence(liveTools(modules));
  const steps = discovery
    .map((stage) => `${stage.stage}. ${stage.tool} — ${stage.purpose}`)
    .join("\n");

  return [
    "pragma is a CLI and MCP server over a design-system knowledge graph.",
    `${CONVENTIONS.system} ${CONVENTIONS.model} ${CONVENTIONS.querying}`,
    "",
    "Discovery sequence:",
    steps,
    "",
    "Call the `capabilities` tool for the full annotated tool catalog; read `pragma:{+uri}` resources (or `graph_inspect`) for entity detail.",
  ].join("\n");
}
