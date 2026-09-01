/**
 * Setup's interaction decision — the SAME `decideInteraction` `create`'s mount
 * calls, against the same TTY gate, with two declared adaptations.
 *
 * (a) `explicitComplete` is constantly `false`. Setup's prompts are
 * PLAN-SHAPING (which rows, which files), not data-bearing; none has or should
 * grow a flag form, so no invocation can be "explicitly complete" in `create`'s
 * sense. Feeding the prompts honestly would be worse than the constant:
 * `explicitAnswersComplete([], {})` is vacuously true, so the promptless
 * sub-verbs would silently MUTATE on a bare piped invocation — which is the
 * exact trap this design closes. The constant degenerates the table to
 * `dry-run > undo > yes > wizard > preview`.
 *
 * (b) The `refuse` mode renders the preview. `create` refuses because
 * scaffolding from defaults without complete input is dangerous AND it can name
 * the missing flags. Setup has no missing flags to name — the refusal body would
 * be empty advice — and the genuinely useful artifact is the plan itself. So
 * setup's refusal IS the dry-run plan plus one hint line, at exit 0: the
 * invocation completed a meaningful read-only unit of work, and a script author
 * who forgot `--yes` reads the hint on the very output they are capturing.
 *
 * An MCP tool call is programmatic consent: `transport === "mcp"` resolves as if
 * `--yes` were passed. The scope default applies there too — the tool writes the
 * global scope unless told otherwise.
 */

import type { InteractionMode } from "@canonical/summon-core/projection";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";

/** The inputs the decision reads, lifted off the runtime. */
export interface SetupModeInput {
  readonly dryRun: boolean;
  readonly undo: boolean;
  readonly yes: boolean;
  readonly isTTY: boolean;
}

/**
 * Lift the decision inputs off a runtime. A tool call over MCP counts as `yes`.
 *
 * @param rt - The per-invocation runtime.
 * @returns The four inputs.
 */
export function setupModeInput(rt: PragmaRuntime): SetupModeInput {
  const interaction = rt.interaction;
  return {
    dryRun: rt.mutation?.preview === true,
    undo: rt.mutation?.undo === true,
    yes: interaction?.yes === true || interaction?.transport === "mcp",
    isTTY: interaction?.isTTY === true,
  };
}

/**
 * Resolve the interaction mode, mirroring `create`'s `resolveCreateMode` so the
 * cross-CLI test style can pin both against the one shared decision.
 *
 * @param input - The four inputs.
 * @param decide - The shared decision, injected so this module needs no value
 *   import of summon-core (it stays behind the verb's lazy import).
 * @returns The resolved mode.
 */
export function resolveSetupMode(
  input: SetupModeInput,
  decide: (arg: {
    dryRun: boolean;
    undo: boolean;
    yes: boolean;
    isTTY: boolean;
    explicitComplete: boolean;
  }) => { mode: InteractionMode },
): InteractionMode {
  return decide({ ...input, explicitComplete: false }).mode;
}
