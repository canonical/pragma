/**
 * Runtime context shapes threaded through the kernel.
 *
 * The grammar (`VerbSpec.run`) receives a {@link PragmaRuntime}; the CLI and
 * MCP projectors build one per invocation. The interface grows one field-group
 * per PR as each layer lands — global flags with the CLI projector, resolved
 * config + provenance with the config layer — so a verb only ever sees fields
 * that are actually populated by the time it runs.
 */

import type { DetailLevel, OutputFormat } from "../../constants.js";

/**
 * Global flags parsed once, before the command tree runs, and shared by every
 * verb. The renderer reads these to pick a formatter; auto-LLM is recorded
 * separately so inferred mode can shape output without switching behaviour.
 */
export interface GlobalFlags {
  /** Condensed Markdown output for LLM/agent consumption. */
  readonly llm: boolean;
  /** True when `llm` was inferred from a non-interactive stdout, not requested. */
  readonly autoLlm?: boolean;
  /** Selected output format; `--format text` is normalised to `plain`. */
  readonly format: OutputFormat;
  /** Diagnostic output to stderr. */
  readonly verbose: boolean;
  /** Explicit progressive-disclosure level from `--detail`, if any. */
  readonly detail?: DetailLevel;
}

/**
 * Per-invocation runtime handed to every verb `run`. Storeless in PR1 — the
 * store handle joins when the first store-backed capability lands.
 */
export interface PragmaRuntime {
  /** Directory the invocation resolves project state (config) against. */
  readonly cwd: string;
  /** CLI version string, surfaced by `info`. */
  readonly version: string;
  /** Global flags for this invocation. */
  readonly globalFlags: GlobalFlags;
}
