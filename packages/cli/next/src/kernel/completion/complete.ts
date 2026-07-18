/**
 * `runComplete` — the `__complete` resolver entry point. THE PROTOCOL:
 *
 * Invocation: `pragma __complete -- <word1> … <current>`
 * - The bin fast-paths `argv[0] === "__complete"` literally, BEFORE
 *   global-flag parsing, Commander, config reads, or first-run — the resolver
 *   is storeless and config-free by construction. The first `--` after
 *   `__complete` is protocol framing and is stripped by the bin (tolerated
 *   absent). A later bare `--` belongs to the user's command line and is
 *   honoured as end-of-options by the state machine.
 * - Words are the raw argv after the program name, up to and INCLUDING the
 *   word being completed — the LAST word is the partial (possibly empty).
 *   Words after the cursor are never sent. A leading word equal to the bin
 *   name is stripped (some shells include it).
 * - Output: matching candidates, newline-delimited, on stdout. Zero
 *   candidates → zero bytes. Nothing else is ever written to stdout.
 * - Exit code: ALWAYS 0. `runComplete` never throws — any internal error
 *   degrades to zero candidates so TAB never breaks a shell.
 * - stderr is silent unless `PRAGMA_COMPLETE_DEBUG=1`, which logs the
 *   classified context, "nothing" reasons (unknown noun/verb, exhausted
 *   positionals, reserved completion kinds), dropped unsafe candidates, and
 *   timing.
 * - Shell floors: bash ≥ 4 (mapfile), zsh ≥ 5, fish ≥ 3. bash splits words at
 *   `=` (COMP_WORDBREAKS), so the state machine treats `=` tokens around a
 *   value-taking flag as transparent.
 *
 * The static scripts (see `emitScripts`) answer structure without exec and
 * invoke `__complete` only for `{kind:"entity"}` value contexts; the resolver
 * is nevertheless a complete standalone answer for EVERY context, so the
 * whole grammar is testable through this one function.
 */

import type { CapabilityModule } from "../spec/types.js";
import { emptyEntityReader } from "./entitySource.js";
import { buildCompletionModel } from "./model.js";
import { parseWords } from "./parse.js";
import { completionDebug, resolveRequest } from "./resolve.js";
import type { CompletionEnv } from "./types.js";

/** The default environment: no entity tier yet (PR2 wires the index reader). */
const DEFAULT_ENV: CompletionEnv = { entities: emptyEntityReader };

/**
 * Resolve completions for the given words against the capability modules.
 *
 * Builds the model, parses the words, resolves the request — wrapped in a
 * never-throw guard: on ANY internal error the answer is zero candidates and
 * (under `PRAGMA_COMPLETE_DEBUG=1`) a stderr note, never an exception.
 *
 * @param words - The command words after the program name; the last is the
 *   partial being completed (possibly empty).
 * @param modules - The capability modules to derive the model from.
 * @param env - The completion environment; defaults to the empty entity seam.
 * @returns The matching candidates, in offer order.
 */
export async function runComplete(
  words: readonly string[],
  modules: readonly CapabilityModule[],
  env: CompletionEnv = DEFAULT_ENV,
): Promise<string[]> {
  const started = performance.now();
  try {
    const model = buildCompletionModel(modules);
    const request = parseWords(words, model);
    const candidates = await resolveRequest(request, model, env);
    completionDebug(
      `context=${request.context.kind} partial=${JSON.stringify(request.partial)} ` +
        `candidates=${candidates.length} in ${(performance.now() - started).toFixed(1)}ms`,
    );
    return candidates;
  } catch (error) {
    completionDebug(
      `error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
