/**
 * The MCP server `instructions` string — orientation sent ONCE in the
 * initialize handshake (not per tool call), so agents arrive oriented.
 *
 * It carries the same content the retired `llm` tool front-loaded: the
 * conventions + the discovery sequence. To guarantee it never diverges from the
 * `capabilities` tool, the WHOLE orientation — the opening line included —
 * derives from the SAME source: the `mcpOrientation` the capabilities module
 * declares (`capabilities/capabilities/catalog.ts`), handed over as data. Live
 * numbers (tier/channel/entity counts) are deliberately DROPPED (they would need
 * a store boot at handshake); agents fetch those via `info`/`config show`/
 * `sources status`. Kept short (a hard length ceiling is asserted in the test),
 * since it counts against every session's context.
 */

import type { CapabilityModule } from "../../spec/index.js";
import { emitSurface } from "../../spec/index.js";

/**
 * Ceiling on the instructions length (asserted by the protected test). Set from
 * measurement plus about a tenth: 1,635 characters once the orientation says
 * which tools read components, up from 1,491 under a 1,500 ceiling.
 */
export const INSTRUCTIONS_MAX_CHARS = 1800;

/**
 * Build the handshake orientation string from the live capability modules.
 *
 * @param modules - The capability modules; the one declaring `mcpOrientation`
 *   supplies the words, the emitted surface the live tool and template names.
 * @returns A short orientation string (≤ {@link INSTRUCTIONS_MAX_CHARS}), empty
 *   when no module declares one.
 */
export function buildInstructions(
  modules: readonly CapabilityModule[],
): string {
  const orientation = modules.find(
    (module) => module.mcpOrientation,
  )?.mcpOrientation;
  if (!orientation) return "";
  // Tools AND resource templates come from the one emitted surface: the
  // `<scheme>:{+uri}` template is declared by the module that serves it and
  // frozen in the covenant, so quoting it here rather than deriving it would be
  // a second copy of a string the kernel does not own.
  const { tools, resources } = emitSurface(modules).mcpSurface;
  const steps = orientation
    .discovery(tools)
    .map((stage) => `${stage.stage}. ${stage.tool} — ${stage.purpose}`)
    .join("\n");
  const templates = resources.map((template) => `\`${template}\``).join(", ");

  return [
    orientation.conventions.join(" "),
    "",
    "Discovery sequence:",
    steps,
    "",
    orientation.closing(templates),
  ].join("\n");
}
