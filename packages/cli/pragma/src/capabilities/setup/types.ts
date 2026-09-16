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
 * `absent` (no pragma entry yet), `registered` (a matching pragma entry already
 * present in every write — a re-run skips it), or `drifted` (a pragma entry
 * exists but differs, so a write updates it). Mirrors the skills step's
 * created/skipped/replaced idempotency at the file grain.
 */
export type McpTargetState = "absent" | "registered" | "drifted";

/**
 * The prior on-disk state of the shell-completion script, read up front by
 * `detectCompletions`: `absent` (no script), `installed` (a byte-identical
 * script is already present — a re-run skips it), or `stale` (a different
 * script is present, so a write updates it).
 */
export type CompletionsState = "absent" | "installed" | "stale";

/**
 * The detected state of the Terrazzo LSP extension across the VS Code-family
 * editors on this machine, probed up front by `detectLsp`.
 *
 * An editor is FOUND by any of three probes — its CLI on PATH, its CLI inside
 * its macOS app bundle, or its per-user configuration directory — and the
 * state is about every editor found, whichever probe found it:
 *
 * - `installed`: every found editor already carries a working copy, so a
 *   re-run skips. A BLOCKED editor (no CLI to run, or an extensions folder
 *   this command must not write to) counts here when it is installed: the
 *   copy really is there, and the block is only about changing it.
 * - `absent`: at least one found editor is missing it. The sideload runs for
 *   the ones that are missing it AND can be written to — never for a blocked
 *   editor, whose row carries its own remedy instead.
 * - `unknown`: NO editor was found by any of the three probes, so the step is
 *   a named skip: there is nothing on this machine to install into.
 */
export type LspState = "installed" | "absent" | "unknown";

/**
 * Why a write cannot happen at a path — a fact with a remedy, never an error.
 *
 * The two kinds are kept apart because their remedies are unrelated: a store
 * path needs a DECLARATION in the config that produced it, and a read-only
 * path needs permissions changed. Collapsing them to one "not writable" would
 * print the `chmod` advice at a Nix user, which cannot work — `chmod` on the
 * store is not the fix, and the next `nixos-rebuild` would undo it.
 *
 * It lives here, beside {@link LspState} and {@link McpTargetState}, because
 * it is the same kind of thing: a setup-domain state vocabulary that the lsp
 * detection, the mcp detection, the target table and doctor all read.
 * `probeWritable` (`operations/writability.ts`) is what produces one.
 */
export type WriteBlock =
  | {
      readonly kind: "nix-store";
      /** The store path the target resolves to — the evidence, and the remedy's subject. */
      readonly resolved: string;
    }
  | {
      readonly kind: "read-only";
      /** The existing node that refused `W_OK` — the path a remedy must name. */
      readonly path: string;
    };
