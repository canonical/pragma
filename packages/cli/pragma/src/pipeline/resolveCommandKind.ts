/**
 * Classify the CLI invocation into a command kind.
 *
 * Determines which pipeline path to take before any store boot occurs.
 * Store-skip commands are listed declaratively in STORE_SKIP_COMMANDS.
 */

import type { CommandKind } from "./types.js";

/** Commands that do not require the ke store to be booted. */
const STORE_SKIP_COMMANDS = new Set(["setup", "mcp"]);

export default function resolveCommandKind(
  argv: readonly string[],
): CommandKind {
  // Completions client — intercept before anything else.
  const completionsIdx = argv.indexOf("--completions");
  if (completionsIdx !== -1) {
    const partial = argv.slice(completionsIdx + 1).join(" ");
    return { kind: "completions-client", partial };
  }

  const commandArg = argv.slice(2).find((a) => !a.startsWith("-"));

  // Completions server — boots its own store with cache.
  if (commandArg === "_completions-server") {
    return { kind: "completions-server" };
  }

  // Doctor runs before store boot — it validates the environment itself.
  if (commandArg === "doctor") {
    return { kind: "doctor" };
  }

  // Store-skip commands (setup, mcp) don't need the ke store.
  if (commandArg && STORE_SKIP_COMMANDS.has(commandArg)) {
    return { kind: "store-skip", command: commandArg };
  }

  return { kind: "store-required" };
}
