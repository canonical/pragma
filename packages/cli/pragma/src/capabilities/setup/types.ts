/**
 * Data shapes for `pragma setup` and its sub-verbs.
 */

/**
 * Which setup entry point is running: the run-all self-verb or one sub-verb.
 * Lives here (a leaf type module) so `setup.verb.ts` can name it WITHOUT a
 * static import of the generator ops — keeping them dynamic-only (lazy-React).
 */
export type SetupMode =
  | "all"
  | "config"
  | "completions"
  | "lsp"
  | "mcp"
  | "skills";

// The scope types are part of the rendering vocabulary — the one module that
// owns both the states and the words for them. Re-exported here so setup's
// type surface stays complete; the definitions (and the structural pin against
// `@canonical/harnesses`) live with the vocabulary.
export type {
  Scope,
  ScopeSelection,
} from "../../kernel/render/vocabulary.js";

/**
 * The prior state of an MCP target file, read up front by `detectMcp`:
 * `absent` (no pragma entry yet), `configured` (a matching pragma entry already
 * present in every write — a re-run skips it), or `drifted` (a pragma entry
 * exists but differs, so a write updates it). Mirrors the skills step's
 * created/skipped/replaced idempotency at the file grain.
 */
export type McpTargetState = "absent" | "configured" | "drifted";

/**
 * The prior on-disk state of the shell-completion script, read up front by
 * `detectCompletions`: `absent` (no script), `installed` (a byte-identical
 * script is already present — a re-run skips it), or `stale` (a different
 * script is present, so a write updates it).
 */
export type CompletionsState = "absent" | "installed" | "stale";

/**
 * The detected state of the Terrazzo LSP extension across the VS Code-family
 * editors on this machine, probed up front by `detectLsp`: `installed` (every
 * editor whose CLI is on PATH already has it — a re-run skips), `absent` (at
 * least one detected editor is missing it, so the sideload runs for those), or
 * `unknown` (NO editor CLI was found on PATH — the step is a named skip, since
 * there is nothing to install into).
 */
export type LspState = "installed" | "absent" | "unknown";
