/**
 * Classify the CLI invocation into a command kind.
 *
 * Determines which pipeline path to take before any store boot occurs.
 * Store-skip commands are listed declaratively in STORE_SKIP_COMMANDS.
 */

import type { CommandKind } from "./types.js";

/** Commands that do not require the ke store to be booted. */
const STORE_SKIP_COMMANDS = new Set(["setup", "mcp"]);

function findCommandArg(argv: readonly string[]): string | undefined {
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--format") {
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      continue;
    }

    return arg;
  }

  return undefined;
}

/**
 * Classify the CLI invocation into a {@link CommandKind} discriminated union.
 *
 * Runs before any store boot to decide the pipeline path.
 *
 * @param argv - Raw process.argv array.
 * @returns Discriminated union indicating the command category.
 */
export default function resolveCommandKind(
  argv: readonly string[],
): CommandKind {
  // Completions client — intercept before anything else.
  const completionsIdx = argv.indexOf("--completions");
  if (completionsIdx !== -1) {
    const partial = argv.slice(completionsIdx + 1).join(" ");
    return { kind: "completions-client", partial };
  }

  const commandArg = findCommandArg(argv);

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
