/**
 * Emit the static shell-completion scripts from the grammar.
 *
 * Builds the completion model from the capability modules (the same
 * derivation the `__complete` resolver uses — the tiers cannot disagree) and
 * renders one script per supported shell. The static tier answers STRUCTURE
 * with zero exec: nouns, verbs, flag names, enum values, mutation + global
 * flags, native file completion. Only `{kind:"entity"}` value contexts shell
 * out to `<bin> __complete`.
 *
 * PR6 boundary (`setup completions`): this module exports pure CONTENT only
 * — shell detection, install paths, mkdir/write effects, and hints all
 * belong to setup. `binName` is parameterized so the PR8 bin swap is free;
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
  return {
    bash: bashScript(model, binName, minChars),
    zsh: zshScript(model, binName, minChars),
    fish: fishScript(model, binName, minChars),
  };
}
