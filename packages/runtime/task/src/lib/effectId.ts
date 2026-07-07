/**
 * Effect identity.
 *
 * These helpers turn an {@link Effect} into a stable {@link EffectId}: the
 * content-addressable descriptor is derived from the effect's identity-bearing
 * fields (excluding closures such as `transform`, a prompt's `validate`, and
 * the `undo` task), canonicalised, and combined with a caller-supplied
 * branch/seq position. They are the substrate a journal builds on to record and
 * replay effect results by identity.
 */

import canonicalJSON from "./canonicalJSON.js";
import type { Effect, EffectId, PromptQuestion } from "./types.js";

/**
 * Extract an effect's identity-bearing content — the serialisable fields that
 * determine which effect this is, with every closure (`transform`, a prompt's
 * `validate`, `undo`) and non-serialisable child (`Parallel`/`Race` tasks)
 * omitted. Two effects with equal content are the same effect for the purpose
 * of recording and replaying its result.
 *
 * @param effect - The effect to describe.
 * @returns The effect's identity content. This is canonicalisable for every
 * tag except `WriteContext`, whose `value` is forwarded verbatim and may be
 * outside {@link canonicalJSON}'s domain.
 */
export function extractEffectContent(effect: Effect): unknown {
  switch (effect._tag) {
    case "ReadFile":
    case "Exists":
    case "DeleteFile":
    case "DeleteDirectory":
      return { path: effect.path };
    case "WriteFile":
      return { path: effect.path, content: effect.content };
    case "AppendFile":
      return {
        path: effect.path,
        content: effect.content,
        createIfMissing: effect.createIfMissing,
      };
    case "TransformFile":
      // The transform closure is not part of identity; its recorded result is.
      return { path: effect.path };
    case "CopyFile":
    case "CopyDirectory":
      return { source: effect.source, dest: effect.dest };
    case "MakeDir":
      return { path: effect.path, recursive: effect.recursive };
    case "Symlink":
      return { target: effect.target, path: effect.path };
    case "Glob":
      return { pattern: effect.pattern, cwd: effect.cwd };
    case "Exec":
      return { command: effect.command, args: effect.args, cwd: effect.cwd };
    case "Prompt":
      return extractPromptContent(effect.question);
    case "Log":
      return { level: effect.level, message: effect.message };
    case "ReadContext":
      return { key: effect.key };
    case "WriteContext":
      return { key: effect.key, value: effect.value };
    case "Parallel":
    case "Race":
      // Children are closures resolved via sub-journals; identity is structural.
      return { taskCount: effect.tasks.length };
  }
}

/**
 * Compute the stable identity of an effect occurrence at a given journal
 * position.
 *
 * @param effect - The effect to identify.
 * @param branch - Structural path of the enclosing parallel/race branch.
 * @param seq - Per-branch occurrence counter.
 * @returns The effect's {@link EffectId}.
 * @throws TypeError When the effect's identity content is not canonicalisable —
 * in practice only a `WriteContext` whose `value` is a function, symbol, class
 * instance, or otherwise outside {@link canonicalJSON}'s domain.
 */
export function computeEffectId(
  effect: Effect,
  branch: string,
  seq: number,
): EffectId {
  return {
    kind: effect._tag,
    content: canonicalJSON(extractEffectContent(effect)),
    branch,
    seq,
  };
}

/**
 * Render an {@link EffectId} to a stable, injective string suitable for
 * equality checks and journal keys. The four fields are encoded as a JSON tuple
 * so a `#` or `:` inside `branch`/`content` can never blur a field boundary.
 *
 * @param id - The effect id to format.
 * @returns A canonical string form of the id.
 */
export function formatEffectId(id: EffectId): string {
  return JSON.stringify([id.branch, id.seq, id.kind, id.content]);
}

/**
 * Extract a prompt's identity-bearing content, dropping the `validate` closure
 * a text prompt may carry so the descriptor stays canonicalisable.
 */
function extractPromptContent(question: PromptQuestion): unknown {
  switch (question.type) {
    case "text":
    case "confirm":
      return {
        type: question.type,
        name: question.name,
        message: question.message,
        default: question.default,
      };
    case "select":
    case "multiselect":
      return {
        type: question.type,
        name: question.name,
        message: question.message,
        default: question.default,
        choices: question.choices,
      };
  }
}
