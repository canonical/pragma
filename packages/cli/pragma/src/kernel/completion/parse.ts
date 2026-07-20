/**
 * The argv state machine: classify the word being completed.
 *
 * `parseWords(words, model)` scans the words BEFORE the cursor to establish
 * position — noun, verb (or self-verb), positionals consumed, pending value
 * flag, end-of-options — then classifies the LAST word (the partial, possibly
 * empty) into a `CompletionContext`. Pure and storeless: only the model and
 * the words.
 *
 * Scan rules (prior words, in order):
 * - A pending value flag consumes the next word as its value. A bare `=`
 *   while pending is transparent — bash splits `--flag=v` into
 *   `--flag`,`=`,`v` (COMP_WORDBREAKS), so `=` tokens around a value-taking
 *   flag are wordbreak noise, not values.
 * - The first bare `--` is the user's end-of-options: everything after is a
 *   positional, never a flag. (The `__complete -- <words…>` FRAMING `--` was
 *   already stripped by the bin.)
 * - A `-…` word (before `--`) is looked up across verb flags → mutation
 *   flags (mutating verbs) → global flags: known value-taking flags without
 *   an inline `=` set the pending flag; known flags are marked used;
 *   unknown flags are skipped silently.
 * - The first non-flag word is the noun; the second resolves a sub-verb, or
 *   falls back to the noun's self-verb as its first positional; later ones
 *   count positionals. Unknown nouns/verbs make non-flag contexts terminal
 *   (`nothing`), but flag contexts still complete (globals always apply).
 *
 * Classification of the current word (first match wins):
 * 1. pending value flag → flag-value for that flag
 * 2. `--name=partial` with a known value-taking flag → flag-value
 * 3. `-…` (before `--`) → flag-name (scoped, used flags de-offered,
 *    `--version` at root only, mutation flags iff the verb mutates)
 * 4. no noun yet → noun
 * 5. unknown noun/verb → nothing
 * 6. noun with sub-verbs, verb undecided → verb
 * 7. verb resolved → positional at the running index (a trailing variadic
 *    absorbs all further indices; past the end → nothing)
 */

import { BIN_NAME } from "../../constants.js";
import { findNoun } from "./model.js";
import type {
  CompletionModel,
  CompletionRequest,
  FlagEntry,
  NounEntry,
  PositionalEntry,
  VerbEntry,
} from "./types.js";

/** Mutable scan state (the machine's registers). */
interface ScanState {
  noun?: NounEntry | "unknown";
  verb?: VerbEntry | "unknown";
  positionalsSeen: number;
  sawDashDash: boolean;
  pendingValueFlag?: FlagEntry;
  readonly used: Set<string>;
}

/** The resolved verb entry, when one is decided and known. */
function knownVerb(state: ScanState): VerbEntry | undefined {
  return typeof state.verb === "object" ? state.verb : undefined;
}

/** Every flag entry in scope at the current position (offer order). */
function flagScope(model: CompletionModel, state: ScanState): FlagEntry[] {
  const verb = knownVerb(state);
  const atRoot = state.noun === undefined;
  return [
    ...(verb?.flags ?? []),
    ...(verb?.mutates ? model.mutationFlags : []),
    ...model.globalFlags.filter((flag) => atRoot || flag.rootOnly !== true),
  ];
}

/** Look up a flag by its full `--name` token in the current scope. */
function lookupFlag(
  model: CompletionModel,
  state: ScanState,
  name: string,
): FlagEntry | undefined {
  return flagScope(model, state).find((entry) => entry.flag === name);
}

/** Consume a prior `-…` word: mark used, maybe set the pending value flag. */
function scanFlagWord(
  word: string,
  model: CompletionModel,
  state: ScanState,
): void {
  const eq = word.indexOf("=");
  if (eq !== -1) {
    const entry = lookupFlag(model, state, word.slice(0, eq));
    if (entry) state.used.add(entry.flag); // inline value travels with the word
    return;
  }
  const entry = lookupFlag(model, state, word);
  if (entry === undefined) return; // unknown flags are skipped silently
  state.used.add(entry.flag);
  if (entry.takesValue) state.pendingValueFlag = entry;
}

/** Consume a prior non-flag word: noun, then verb/self-verb, then positionals. */
function scanCommandWord(
  word: string,
  model: CompletionModel,
  state: ScanState,
): void {
  if (state.noun === undefined) {
    const entry = findNoun(model, word);
    if (entry === undefined) {
      state.noun = "unknown";
      return;
    }
    state.noun = entry;
    // A self-verb-only noun is its own verb; positionals start right away.
    if (entry.verbs.length === 0 && entry.selfVerb) {
      state.verb = entry.selfVerb;
    }
    return;
  }
  if (state.noun === "unknown" || state.verb === "unknown") return;

  if (state.verb === undefined) {
    const match = state.noun.verbs.find((verb) => verb.label === word);
    if (match) {
      state.verb = match;
      return;
    }
    if (state.noun.selfVerb) {
      // Not a sub-verb: the word is the self-verb's first positional.
      state.verb = state.noun.selfVerb;
      state.positionalsSeen = 1;
      return;
    }
    state.verb = "unknown";
    return;
  }

  state.positionalsSeen += 1;
}

/** The positional entry at an index (a trailing variadic absorbs the rest). */
function positionalAt(
  verb: VerbEntry,
  index: number,
): PositionalEntry | undefined {
  const direct = verb.positionals[index];
  if (direct) return direct;
  const last = verb.positionals[verb.positionals.length - 1];
  return last?.variadic ? last : undefined;
}

/** Flag names offerable now: scoped, de-offered when used and not repeatable. */
function offeredFlagNames(model: CompletionModel, state: ScanState): string[] {
  return flagScope(model, state)
    .filter((entry) => entry.repeatable || !state.used.has(entry.flag))
    .map((entry) => entry.flag);
}

/** Classify the current word against the scanned state (rules 1–7). */
function classify(
  current: string,
  model: CompletionModel,
  state: ScanState,
): CompletionRequest {
  const pending = state.pendingValueFlag;
  if (pending) {
    // bash `=` wordbreaks: `--flag =` completes an empty value, `--flag = v`
    // arrives as a leading-`=` partial in some shells.
    const partial =
      current === "="
        ? ""
        : current.startsWith("=")
          ? current.slice(1)
          : current;
    return {
      context: {
        kind: "flag-value",
        flag: pending.flag,
        source: pending.source,
      },
      partial,
    };
  }

  if (!state.sawDashDash && current.startsWith("--")) {
    const eq = current.indexOf("=");
    if (eq !== -1) {
      const entry = lookupFlag(model, state, current.slice(0, eq));
      if (entry?.takesValue) {
        return {
          context: {
            kind: "flag-value",
            flag: entry.flag,
            source: entry.source,
          },
          partial: current.slice(eq + 1),
        };
      }
    }
  }

  if (!state.sawDashDash && current.startsWith("-")) {
    return {
      context: { kind: "flag-name", flags: offeredFlagNames(model, state) },
      partial: current,
    };
  }

  if (state.noun === undefined) {
    return { context: { kind: "noun" }, partial: current };
  }
  if (state.noun === "unknown") {
    return {
      context: { kind: "nothing", reason: "unknown noun" },
      partial: current,
    };
  }
  if (state.verb === "unknown") {
    return {
      context: { kind: "nothing", reason: "unknown verb" },
      partial: current,
    };
  }

  if (state.verb === undefined) {
    return {
      context: { kind: "verb", noun: state.noun.noun },
      partial: current,
    };
  }

  const positional = positionalAt(state.verb, state.positionalsSeen);
  if (positional === undefined) {
    return {
      context: { kind: "nothing", reason: "positionals exhausted" },
      partial: current,
    };
  }
  return {
    context: {
      kind: "positional",
      name: positional.name,
      source: positional.source,
    },
    partial: current,
  };
}

/**
 * Parse completion words into a classified request.
 *
 * @param words - The command words up to and including the cursor word (the
 *   last word is the partial being completed, possibly empty). A leading
 *   word equal to `binName` is stripped.
 * @param model - The completion model.
 * @param binName - The program name some shells include as the first word.
 * @returns The classified context plus the partial.
 */
export function parseWords(
  words: readonly string[],
  model: CompletionModel,
  binName: string = BIN_NAME,
): CompletionRequest {
  const stripped = words[0] === binName ? words.slice(1) : words;
  const current = stripped[stripped.length - 1] ?? "";
  const prior = stripped.slice(0, -1);

  const state: ScanState = {
    positionalsSeen: 0,
    sawDashDash: false,
    used: new Set(),
  };

  for (const word of prior) {
    if (state.pendingValueFlag) {
      if (word === "=") continue; // bash wordbreak noise, value still pending
      state.pendingValueFlag = undefined; // the word is the flag's value
      continue;
    }
    if (!state.sawDashDash && word === "--") {
      state.sawDashDash = true;
      continue;
    }
    if (!state.sawDashDash && word.startsWith("-")) {
      scanFlagWord(word, model, state);
      continue;
    }
    scanCommandWord(word, model, state);
  }

  return classify(current, model, state);
}
