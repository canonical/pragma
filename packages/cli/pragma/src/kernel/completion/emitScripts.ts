/**
 * Emit the static shell-completion scripts from the grammar.
 *
 * Builds the completion model from the capability modules (the same
 * derivation the `__complete` resolver uses — the tiers cannot disagree) and
 * renders one script per supported shell. The static tier answers STRUCTURE
 * with zero exec — nouns, verbs, flag names, enum values, mutation + global
 * flags, native file completion — and that is now true of ALL THREE shells,
 * executed rather than asserted (`shellDrive.test.ts`). It was a bash/zsh claim
 * until PR7: fish evaluates every `complete` rule matching a position rather
 * than one exclusive `case` arm, so a flag-name TAB fired the positional's
 * delegation too. Only `{kind:"names"}` value contexts shell out to
 * `<bin> __complete`.
 *
 * PR6 boundary (`setup completions`): this module exports pure CONTENT only
 * — shell detection, install paths, mkdir/write effects, and hints all
 * belong to setup. `binName` is parameterized so a fork's rename reaches the
 * script body (`completionScriptPath` derives the file NAME from the same
 * constant, and the two must agree or the shell never loads the file);
 * `minChars` and `disabledFamilies` are read from `completion` config by setup.
 *
 * `minChars` (default {@link DEFAULT_MIN_CHARS}) is baked into the scripts to
 * gate the `__complete` exec for NAME contexts only — structure and enum values
 * stay inlined and complete on bare TAB with zero exec. `disabledFamilies`
 * scrubs a noun's name sources to `none` (the config-level opt-out), so its
 * name arms drop out of every script; the pack-grammar opt-out (`enabled:false`)
 * lands earlier, in the model.
 *
 * @throws Emitting THROWS on any name outside the safety allowlist (the
 *   model build asserts, and every template re-asserts what it inlines) —
 *   `setup completions` fails loudly rather than installing a hostile token.
 */

import { BIN_NAME } from "../../constants.js";
import type { CapabilityModule } from "../spec/types.js";
import { assertSafeToken, buildCompletionModel } from "./model.js";
import { bashScript } from "./templates/bash.js";
import { fishScript } from "./templates/fish.js";
import { zshScript } from "./templates/zsh.js";
import type {
  CompletionModel,
  CompletionSource,
  Shell,
  VerbEntry,
} from "./types.js";

/** The default `minChars` gate baked into the generated scripts. */
export const DEFAULT_MIN_CHARS = 2;

/**
 * The shell reserved words a NOUN may not be, because the templates inline a
 * noun at `case`-pattern start and the shell reads it as grammar there.
 *
 * ONE word, and the set is the measurement rather than a category. Every one of
 * bash's 17 reserved words was rendered into the live `bashScript`/`zshScript`
 * as `nouns[0].noun` and handed to real GNU bash 5.2.21 and real zsh 5.9:
 *
 * | `bash -n` / `zsh -n` | words |
 * |---|---|
 * | rejects | `esac` (bash rc 2, zsh rc 1) |
 * | accepts | `case coproc do done elif else fi for function if in select then time until while` |
 *
 * A reserved word is only reserved in COMMAND position, and a `case` arm pattern
 * is not one — so only the terminator of `case "$noun" in … esac` closes the
 * statement early. The rest of the file is then a syntax error, `_pragma` is
 * never defined, and the user gets NO COMPLETION AT ALL, silently, from a
 * valid-looking installed file. `fish -n` does not catch it either, because
 * fish's script is `complete -c` lines with no `case`.
 *
 * VERB LABELS are not checked. The same 17 words were re-measured in a verb
 * position and all 17 parse in both shells, because a verb only ever reaches a
 * script inside a compound pattern (`block/esac)`), a `compgen -W` word list or
 * a `compadd --` list — never at pattern start. Guarding them would take 17
 * plausible words away from what a fork may declare as CONTENT, on a hazard
 * measurement contradicts.
 */
const RESERVED_NOUNS: ReadonlySet<string> = new Set(["esac"]);

/**
 * Assert a noun may be INLINED into a shell script's grammar, not merely printed
 * as a candidate.
 *
 * Deliberately separate from `assertSafeToken`, and deliberately living HERE
 * rather than in `model.ts`. The two hazards are not the same:
 *
 * - `assertSafeToken` guards INJECTION. It must run everywhere a token reaches
 *   a shell, including at runtime — `resolve.ts` filters `__complete`
 *   candidates through `SAFE_TOKEN_RE` before printing them.
 * - This guards a token being taken for GRAMMAR. That can only happen where a
 *   token is written INTO a script, which is this module. At runtime a reserved
 *   word is harmless: a candidate is printed, never evaluated.
 *
 * So it is module-private to the emitter, which nothing on the `__complete` fast
 * path imports — where `model.ts`, which `complete.ts` does import, would have
 * carried both the set and two exports that path never uses.
 *
 * @param noun - The candidate noun.
 * @throws Error when the noun is a reserved word the templates cannot inline.
 */
function assertShellUsableNoun(noun: string): void {
  if (RESERVED_NOUNS.has(noun)) {
    throw new Error(
      `completion: reserved shell word ${JSON.stringify(noun)} in noun ` +
        `${JSON.stringify(noun)} — it terminates the \`case "$noun" in … esac\` ` +
        "dispatch, so bash and zsh refuse the generated script and no " +
        "completion is installed at all; rename it",
    );
  }
}

/** Options for {@link emitScripts}. */
export interface EmitScriptsOptions {
  /** The binary to complete; defaults to {@link BIN_NAME} (`pragma`). */
  readonly binName?: string;
  /** Min chars before a name source execs `__complete` (default 2). */
  readonly minChars?: number;
  /** Noun families whose name completion is disabled (config opt-out). */
  readonly disabledFamilies?: readonly string[];
}

/** Replace a name source with `none` (the family-level opt-out). */
function scrubSource(source: CompletionSource): CompletionSource {
  return source.kind === "names" ? { kind: "none" } : source;
}

/** Scrub every name source of a verb entry to `none`. */
function scrubVerb(verb: VerbEntry): VerbEntry {
  return {
    ...verb,
    flags: verb.flags.map((flag) => ({
      ...flag,
      source: scrubSource(flag.source),
    })),
    positionals: verb.positionals.map((positional) => ({
      ...positional,
      source: scrubSource(positional.source),
    })),
  };
}

/**
 * Drop name completion for the disabled noun families (config opt-out): every
 * name source under a disabled noun becomes `none`, so no template emits its
 * exec. A pure structural transform on the model — the templates stay unaware.
 */
function applyDisabledFamilies(
  model: CompletionModel,
  disabled: ReadonlySet<string>,
): CompletionModel {
  if (disabled.size === 0) return model;
  return {
    ...model,
    nouns: model.nouns.map((noun) =>
      disabled.has(noun.noun)
        ? {
            ...noun,
            ...(noun.selfVerb ? { selfVerb: scrubVerb(noun.selfVerb) } : {}),
            verbs: noun.verbs.map(scrubVerb),
          }
        : noun,
    ),
  };
}

/**
 * Emit the completion scripts for every supported shell.
 *
 * @param modules - The capability modules to derive completions from.
 * @param options - Bin name, `minChars` gate, and disabled name families.
 * @returns A map of shell to its completion script.
 * @throws Error when any inlinable token fails the safety allowlist.
 */
export function emitScripts(
  modules: readonly CapabilityModule[],
  options: EmitScriptsOptions = {},
): Record<Shell, string> {
  const binName = options.binName ?? BIN_NAME;
  assertSafeToken(binName, "bin name");
  const minChars = options.minChars ?? DEFAULT_MIN_CHARS;
  const model = applyDisabledFamilies(
    buildCompletionModel(modules),
    new Set(options.disabledFamilies ?? []),
  );
  // A noun is inlined at `case`-pattern start, so a shell RESERVED WORD there
  // breaks the script's grammar even though it passes the injection allowlist.
  // Checked at emit — the one place a token becomes syntax — rather than in the
  // model, which is on the `__complete` fast path and where a candidate is only
  // ever printed. Verb labels are NOT checked; see `RESERVED_NOUNS`.
  for (const noun of model.nouns) assertShellUsableNoun(noun.noun);
  return {
    bash: bashScript(model, binName, minChars),
    zsh: zshScript(model, binName, minChars),
    fish: fishScript(model, binName, minChars),
  };
}
