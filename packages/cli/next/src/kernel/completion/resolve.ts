/**
 * Resolve a classified completion request into candidates.
 *
 * Structural contexts (noun, verb, flag-name) filter their model-derived
 * tables with the case-sensitive {@link filterPrefix} — the same offers the
 * static scripts inline. Value contexts (flag-value, positional) go through
 * the source table: enum values and entity names are ranked case-insensitively
 * and capped; `files` returns nothing (the static scripts complete files
 * natively — the resolver never lists the filesystem); `none` and unknown
 * (reserved) kinds return nothing.
 *
 * Injection safety, runtime gate: every value-tier candidate must match the
 * same {@link SAFE_TOKEN_RE} allowlist the emit-time gate enforces — hostile
 * names from an index file are dropped before they can reach a shell buffer.
 * Structural candidates were already asserted safe when the model was built.
 */

import { findNoun, SAFE_TOKEN_RE } from "./model.js";
import { filterPrefix, MAX_CANDIDATES, rankCandidates } from "./rank.js";
import type {
  CompletionEnv,
  CompletionModel,
  CompletionRequest,
  CompletionSource,
} from "./types.js";

/**
 * Write a completion debug line to stderr when `PRAGMA_COMPLETE_DEBUG=1`.
 * Silent otherwise — stdout is reserved for candidates, and stderr must not
 * leak into shell buffers during normal completion.
 *
 * @param message - The debug message (prefixed with `[complete]`).
 * @note Impure — reads the environment, writes stderr.
 */
export function completionDebug(message: string): void {
  if (process.env.PRAGMA_COMPLETE_DEBUG === "1") {
    process.stderr.write(`[complete] ${message}\n`);
  }
}

/** Drop candidates that fail the shell-safety allowlist (with a debug note). */
function sanitize(candidates: readonly string[]): readonly string[] {
  const safe = candidates.filter((candidate) => SAFE_TOKEN_RE.test(candidate));
  if (safe.length !== candidates.length) {
    completionDebug(
      `dropped ${candidates.length - safe.length} unsafe candidate(s)`,
    );
  }
  return safe;
}

/** Resolve a value-tier source into ranked, sanitized candidates. */
async function resolveSource(
  source: CompletionSource,
  partial: string,
  env: CompletionEnv,
): Promise<string[]> {
  switch (source.kind) {
    case "values":
      return rankCandidates(sanitize(source.values), partial);
    case "names": {
      let names: readonly string[];
      try {
        names = await env.names(source.ref);
      } catch (error) {
        // The seam contract is never-throw; degrade anyway, never break TAB.
        completionDebug(
          `name source read failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return [];
      }
      return rankCandidates(
        sanitize(names),
        partial,
        MAX_CANDIDATES,
        source.match,
        source.caseSensitive,
      );
    }
    case "files":
      // Consumer rule: files are completed natively by the shell scripts
      // (compgen -f / _files / fish -rF); the resolver offers nothing.
      return [];
    case "none":
      return [];
    default: {
      // Reserved kinds ({kind:"query"} and future ones) are not in the union;
      // if one arrives at runtime it resolves to nothing, with a reason.
      const kind = (source as { kind: string }).kind;
      completionDebug(`nothing: reserved completion kind "${kind}"`);
      return [];
    }
  }
}

/**
 * Resolve a parsed completion request against the model and environment.
 *
 * @param request - The classified context plus partial from `parseWords`.
 * @param model - The completion model.
 * @param env - The completion environment (the entity seam).
 * @returns Matching candidates, ranked/filtered per tier; `[]` when there is
 *   nothing to offer.
 */
export async function resolveRequest(
  request: CompletionRequest,
  model: CompletionModel,
  env: CompletionEnv,
): Promise<string[]> {
  const { context, partial } = request;
  switch (context.kind) {
    case "noun":
      return filterPrefix(
        model.nouns.map((entry) => entry.noun),
        partial,
      );
    case "verb": {
      const noun = findNoun(model, context.noun);
      return filterPrefix(
        (noun?.verbs ?? []).map((verb) => verb.label),
        partial,
      );
    }
    case "flag-name":
      return filterPrefix(context.flags, partial);
    case "flag-value":
    case "positional":
      return resolveSource(context.source, partial, env);
    case "nothing":
      completionDebug(`nothing: ${context.reason}`);
      return [];
  }
}
