/**
 * The ONE interaction decision (R2). Both products call this — the summon bin
 * and pragma's `create` — so a given (flags, TTY, answers) state produces the
 * same mode in either binary. The normative table lives in
 * `docs/parity-contract.md`, EMITTED from this module; the exhaustive 32-cell
 * test in `decideInteraction.test.ts` pins every row.
 *
 * Precedence: `--dry-run` > `--undo` > the rest. The batch modes ignore TTY —
 * a dry-run or undo is a batch render wherever it runs. Then `--yes` means
 * run-with-defaults; a TTY gets the wizard (which asks only `pendingPrompts`);
 * a non-TTY with a fully-explicit answer set is a legitimate scripted run; and
 * a non-TTY mutation with incomplete input REFUSES — exit 2 with recovery —
 * rather than silently scaffolding from defaults.
 */

import toKebabCase from "./kebab.js";
import type { PromptLike } from "./types.js";

/** The five interaction modes a CLI invocation resolves to. */
export type InteractionMode =
  | "batch-dry-run"
  | "batch-undo"
  | "run"
  | "wizard"
  | "refuse";

/** The five inputs the decision reads — nothing else may influence it. */
export interface InteractionInput {
  /** `--dry-run` (or a mode that implies it). */
  readonly dryRun: boolean;
  /** `--undo`. */
  readonly undo: boolean;
  /** `--yes` (or a mode that implies it). */
  readonly yes: boolean;
  /** The HOST's TTY fact (each host's definition is stated in the contract). */
  readonly isTTY: boolean;
  /** `explicitAnswersComplete(prompts, explicit)` — defaults do not count. */
  readonly explicitComplete: boolean;
}

/** The decision: the mode, with `refusal` set iff the mode is `refuse`. */
export interface InteractionDecision {
  readonly mode: InteractionMode;
  readonly refusal?: true;
}

/**
 * Decide the interaction mode for one invocation.
 *
 * @param input - The five decision inputs.
 * @returns The mode (and the `refusal` marker on row 6).
 */
export function decideInteraction(
  input: InteractionInput,
): InteractionDecision {
  if (input.dryRun) return { mode: "batch-dry-run" };
  if (input.undo) return { mode: "batch-undo" };
  if (input.yes) return { mode: "run" };
  if (input.isTTY) return { mode: "wizard" };
  if (input.explicitComplete) return { mode: "run" };
  return { mode: "refuse", refusal: true };
}

/**
 * The kebab-case flags of the unconditional prompts absent from the explicit
 * answers, in declared order — the `Missing:` list of the refusal message.
 *
 * @param prompts - The command's prompts (live or projected).
 * @param explicit - The explicitly provided answers (no defaults).
 * @returns Kebab-case flag names (without `--`).
 */
export function missingExplicitFlags(
  prompts: readonly PromptLike[],
  explicit: Readonly<Record<string, unknown>>,
): string[] {
  return prompts
    .filter(
      (prompt) =>
        !(prompt.when !== undefined || prompt.conditional === true) &&
        !(prompt.name in explicit),
    )
    .map((prompt) => toKebabCase(prompt.name));
}

/**
 * The refusal message — authored ONCE here, written verbatim by BOTH CLIs
 * (stderr, exit 2).
 *
 * @param missingKebabFlags - The missing flags (see {@link missingExplicitFlags}).
 * @returns The complete refusal message.
 */
export function refusalMessage(missingKebabFlags: readonly string[]): string {
  const base =
    "Refusing to scaffold in a non-interactive run without complete input. " +
    "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag.";
  if (missingKebabFlags.length === 0) return base;
  const flags = missingKebabFlags.map((flag) => `--${flag}`).join(", ");
  return `${base} Missing: ${flags}.`;
}
