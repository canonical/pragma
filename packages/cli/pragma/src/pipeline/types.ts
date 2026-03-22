/**
 * Discriminated union classifying the CLI invocation for pipeline routing.
 *
 * - `"completions-client"` — shell completion request with a partial input string.
 * - `"completions-server"` — background completions daemon.
 * - `"doctor"` — environment validation (runs before store boot).
 * - `"store-skip"` — commands that do not need the ke store (e.g., `setup`, `mcp`).
 * - `"store-required"` — standard domain commands requiring a booted store.
 */
type CommandKind =
  | { kind: "completions-client"; partial: string }
  | { kind: "completions-server" }
  | { kind: "doctor" }
  | { kind: "store-skip"; command: string }
  | { kind: "store-required" };

export type { CommandKind };
