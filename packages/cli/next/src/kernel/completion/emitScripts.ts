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
 * belong to setup. `binName` is parameterized so the PR8 bin swap is free.
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
import type { Shell } from "./types.js";

/** Options for {@link emitScripts}. */
export interface EmitScriptsOptions {
  /** The binary to complete; defaults to {@link BIN_NAME} (`pragma2`). */
  readonly binName?: string;
}

/**
 * Emit the completion scripts for every supported shell.
 *
 * @param modules - The capability modules to derive completions from.
 * @param options - The bin name to target (defaults to `pragma2`).
 * @returns A map of shell to its completion script.
 * @throws Error when any inlinable token fails the safety allowlist.
 */
export function emitScripts(
  modules: readonly CapabilityModule[],
  options: EmitScriptsOptions = {},
): Record<Shell, string> {
  const binName = options.binName ?? BIN_NAME;
  assertSafeToken(binName, "bin name");
  const model = buildCompletionModel(modules);
  return {
    bash: bashScript(model, binName),
    zsh: zshScript(model, binName),
    fish: fishScript(model, binName),
  };
}
