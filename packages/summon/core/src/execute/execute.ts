/**
 * The summon↔pragma seam: turn a generator + a prompt strategy into a
 * `Task<GeneratorResult>` — WITHOUT running it.
 *
 * This one function is the whole seam. Both binaries build the same task here
 * and interpret it their own way: pragma's `create` verb forwards the prompt
 * strategy through `runtime.exec.promptHandler` and lets the kernel interpret
 * it under the node / dry-run / undo interpreters; the summon bin runs it via
 * `runGeneratorTask({ promptHandler })`. Same package + same handler ⇒
 * byte-identical files.
 *
 * Because `execute` returns a task and does NOT run it, `--dry-run` and
 * `--undo` keep working unchanged through the kernel's existing interpreters
 * (which mock `Prompt` effects to their defaults). The task's shape is:
 *
 *   collectAnswers → validate → confirm gate → generate → result
 *
 * The confirm gate is an ordinary `confirm` Prompt effect ({@link CONFIRM_ANSWER_KEY}):
 * the non-interactive strategies resolve it to its default (`true`) and the
 * dry-run interpreter mocks it to `true`, so it is a no-op there; the Ink
 * strategy recognises the key and renders the preview + "Proceed?" gate. It is
 * the single signal that answer collection is complete — which a streaming
 * per-question handler otherwise cannot know.
 */

import { $, dryRun, fail, gen, prompt, type Task } from "@canonical/task";
import type { PromptHandler } from "../prompt/types.js";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import collectAnswers, { type AnswerablePrompt } from "./collectAnswers.js";
import type { GeneratorResult } from "./GeneratorResult.js";
import validateAnswers from "./validateAnswers.js";

/** The reserved answer key of the confirm gate the Ink strategy recognises. */
export const CONFIRM_ANSWER_KEY = "__summon_proceed__";

/** Task-error code for an answer that fails its prompt's own constraints. */
export const GENERATOR_INVALID_ANSWER = "GENERATOR_INVALID_ANSWER";

/** Task-error code for a run cancelled at the interactive confirm gate. */
export const GENERATOR_CANCELLED = "GENERATOR_CANCELLED";

/** The context {@link execute} builds its task from. */
export interface ExecuteContext {
  /**
   * The prompt strategy the returned task is meant to be interpreted with. The
   * runner (`runTask` / `runGeneratorTask`) applies it; `execute` itself never
   * calls it, so the same task dry-runs and undoes unchanged.
   */
  readonly prompt: PromptHandler;
  /** Answers already provided (CLI flags / MCP args) — asked prompts are skipped. */
  readonly params: Readonly<Record<string, unknown>>;
  /** Abort signal, honoured by the interpreter between effects. */
  readonly signal?: AbortSignal;
}

/**
 * Build the seam task for one generator run.
 *
 * @param generator - The generator to run.
 * @param ctx - The prompt strategy, provided answers, and optional abort signal.
 * @returns A task that collects+validates answers, gates on confirmation, then
 *   performs the generation and yields a {@link GeneratorResult}.
 */
export default function execute(
  generator: GeneratorDefinition,
  ctx: ExecuteContext,
): Task<GeneratorResult> {
  return gen(function* () {
    // 1. Collect answers — asks each unprovided, applicable prompt as a Prompt
    //    effect through the runner's injected handler (ctx.prompt).
    const answers = yield* $(
      collectAnswers(
        generator.prompts as readonly AnswerablePrompt[],
        ctx.params,
      ),
    );

    // 2. Validate — reject the same bad input (unknown enum, failing validator)
    //    a wizard would, so flag/MCP-arg runs are held to the same constraints.
    const invalid = validateAnswers(generator.prompts, answers);
    if (invalid !== null) {
      yield* $(fail({ code: GENERATOR_INVALID_ANSWER, message: invalid }));
    }

    // 3. Confirm gate — see the module doc. Auto/MCP/dry-run resolve to `true`.
    const proceed = yield* $(
      prompt({
        type: "confirm",
        name: CONFIRM_ANSWER_KEY,
        message: "Proceed?",
        default: true,
      }),
    );
    if (proceed === false) {
      yield* $(fail({ code: GENERATOR_CANCELLED, message: "Cancelled." }));
    }

    // 4. Build once, preview its effects (pure), then perform them. On the
    //    dry-run interpreter step 4's `generate` effects ARE the plan; on the
    //    node interpreter they write for real. The preview gives the outcome
    //    summary its file list without re-running side effects.
    const built = generator.generate(answers);
    const effects = dryRun(built).effects;
    yield* $(built);

    return { generator, answers, effects };
  });
}
