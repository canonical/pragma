/**
 * Server `instructions` for the MCP `initialize` result.
 *
 * Six authored convention lines plus a compact state snapshot (from the
 * shared state payload, so the values cannot drift from `pragma://state`)
 * and the snapshot caveat. Kept deliberately small — this text is
 * prepended to every client session.
 */

import buildStatePayload from "../domains/shared/state/buildStatePayload.js";
import type { PragmaRuntime } from "../domains/shared/types/index.js";

/** The authored convention lines, in reading order. */
const CONVENTIONS: readonly string[] = [
  "Pragma serves a design-system knowledge graph (blocks, tokens, modifiers, standards, ontologies) over tools, prompts, and resources.",
  "Data is scoped by tier (hierarchical: global > apps > apps/lxd) and channel; the ACTIVE scope silently filters every list and lookup.",
  "Entities are addressed by name or prefixed IRI (e.g. ds:global.component.button); ontology_list discovers namespaces.",
  "First time on a data family? Call its *_sample tool to see real shapes before querying; for multi-step workflows, use the prompts surface.",
  "Prefer per-call overrides (allTiers, detail) over config_* mutations — config changes persist for the human too.",
  "Read pragma://state for live tier/channel/detail/packages (tools-only harnesses: call the capabilities tool).",
];

/**
 * Build the instructions string served in the `initialize` result.
 *
 * Synchronous by design: the snapshot renders from config, origins, and
 * resolved packages already on the runtime — no store queries — so server
 * construction stays non-async.
 *
 * @param runtime - The runtime slice carrying config, origins, packages.
 * @returns The instructions text (conventions + state snapshot + caveat).
 */
export default function buildInstructions(
  runtime: Pick<PragmaRuntime, "config" | "origins" | "packages">,
): string {
  const { state } = buildStatePayload(runtime);
  const snapshot =
    `Current state at connect: tier=${state.tier.value ?? "unset"}, ` +
    `channel=${state.channel.value}, detail=${state.detail.value ?? "unset"}, ` +
    `packages=${runtime.packages.length} loaded. ` +
    "This snapshot reflects connect time — re-read pragma://state after any config_* call.";

  return [...CONVENTIONS.map((line) => `- ${line}`), "", snapshot].join("\n");
}
