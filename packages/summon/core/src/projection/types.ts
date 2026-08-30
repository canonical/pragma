/**
 * The command-surface projection's vocabulary.
 *
 * A generator's CLI surface — its command path, its flags, its positional, its
 * grouped help — DERIVES from `GeneratorDefinition.prompts`. This module names
 * the shapes of that derivation: a {@link ProjectedPrompt} is the serializable
 * image of a prompt (functions dropped), a {@link SurfaceCommand} is one
 * command of the projected tree, and {@link CommandEntry}/{@link OptionInfo}
 * are the registration shapes both binaries consume (moved here from the
 * summon bin, which was their only owner).
 *
 * Everything here is data: no functions, so a {@link SurfaceCommand} can be
 * emitted by a build step, committed, and compared against the live generators.
 */

import type GeneratorDefinition from "../types/GeneratorDefinition.js";

/**
 * The serializable image of a {@link import("../types/PromptDefinition.js").default}:
 * everything the CLI surface derives from, and nothing it cannot serialize.
 * `validate` is dropped (enforced at execute time by `validateAnswers`);
 * a `when` condition collapses to `conditional: true` (its predicate is
 * evaluated only by a live wizard).
 */
export interface ProjectedPrompt {
  /** Unique identifier, used as answer key and CLI flag name. */
  readonly name: string;
  /** Prompt kind, deciding flag shape and answer parsing. */
  readonly type: "text" | "confirm" | "select" | "multiselect";
  /** Question text displayed to the user (and used as flag help). */
  readonly message: string;
  /** Default value if the user provides no input. */
  readonly default?: unknown;
  /** Choices for select/multiselect prompts. */
  readonly choices?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  /** True when the prompt can be provided as the command's one positional. */
  readonly positional?: boolean;
  /** Group name for organizing options in `--help` output. */
  readonly group?: string;
  /** True when the live prompt carries a `when` condition (wizard-evaluated). */
  readonly conditional?: boolean;
}

/**
 * A prompt as the projection's helpers accept it: either a live
 * `PromptDefinition` (whose `when`/`validate` are functions) or a
 * {@link ProjectedPrompt} (where `when` collapsed to `conditional`). The
 * helpers read only the projected fields plus the presence of `when`.
 */
export type PromptLike = ProjectedPrompt & {
  readonly when?: unknown;
  readonly validate?: unknown;
};

/** One command of the projected generator tree, fully serializable. */
export interface SurfaceCommand {
  /** Path segments to this command (e.g. `["component", "react"]`). */
  readonly path: readonly string[];
  /** The generator's `meta.description`. */
  readonly description: string;
  /** The projected prompts, in declared (asking) order. */
  readonly prompts: readonly ProjectedPrompt[];
}

/**
 * What the registration path actually READS of a runnable entry: a
 * description and the prompt list. A live {@link GeneratorDefinition}
 * satisfies it directly. A build-time {@link SurfaceCommand} does NOT — it
 * carries a top-level `description` where this needs `meta.description`,
 * and its readonly `path` belongs to {@link CommandEntry} (which owns a
 * mutable one) — so a host mounting the projected tree without loading a
 * single generator wraps each surface command in a small adapter
 * (`{ meta: { description: surface.description }, prompts: surface.prompts }`).
 */
export interface SurfaceGenerator {
  readonly meta: { readonly description: string };
  readonly prompts: readonly PromptLike[];
}

/**
 * A flattened representation of a command to register.
 * Separates command discovery from registration.
 *
 * Generic over the runnable payload: the summon bin carries live
 * {@link GeneratorDefinition}s (the default), a build-time host carries
 * projected {@link SurfaceGenerator}s.
 */
export interface CommandEntry<
  G extends SurfaceGenerator = GeneratorDefinition,
> {
  /** Path segments to this command (e.g., ["component", "react"]) */
  path: string[];
  /** The generator definition if this is a runnable command */
  generator?: G;
  /** Description for namespace-only commands */
  description?: string;
}

/**
 * Option metadata built from a prompt definition for Commander.
 */
export interface OptionInfo {
  flags: string;
  description: string;
  defaultValue?: string;
  group?: string;
  /** The original camelCase prompt name */
  promptName: string;
  /** The kebab-case flag name (without --) */
  kebabName: string;
}

/**
 * A host's standard per-generator flag list, injected into grouped help: each
 * entry is a `--help` row (`flags` column + description). The projection never
 * hard-codes a host's flags — summon's nine and pragma's mutation trio are
 * both just data handed in here.
 */
export type HostFlags = ReadonlyArray<{
  readonly flags: string;
  readonly description: string;
}>;
