/**
 * Global-flag pre-parsing, ahead of Commander.
 *
 * `--format`, `--verbose`, and `--detail` may appear anywhere on the line, so
 * they are scanned and stripped before Commander sees argv — otherwise
 * `enablePositionalOptions()` scoping would reject a flag placed after a verb.
 * Ported from the v1 `parseGlobalFlags`, with two v2 changes: a new `--detail`
 * flag and the `--format text` value renamed to `plain` (the kernel's
 * {@link OutputFormat}). The dedicated `--llm` flag was folded into
 * `--format llm`, leaving auto-detection as the sole implicit trigger. Both the
 * space (`--format json`) and equals (`--format=json`) forms are recognized.
 */

import { DETAIL_LEVELS, type DetailLevel } from "../../../constants.js";
import type { GlobalFlags } from "../../runtime/types.js";

/**
 * Read a `--flag`'s value, accepting both `--flag value` and `--flag=value`.
 *
 * @param argv - Raw argv (already sliced to the user's arguments).
 * @param flag - The flag including leading dashes (e.g. `--format`).
 * @returns The value, or `undefined` when the flag is absent.
 */
function readFlagValue(
  argv: readonly string[],
  flag: string,
): string | undefined {
  const equalsPrefix = `${flag}=`;
  const equalsArg = argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg !== undefined) {
    return equalsArg.slice(equalsPrefix.length);
  }
  const spaceIndex = argv.indexOf(flag);
  return spaceIndex === -1 ? undefined : argv[spaceIndex + 1];
}

/**
 * Read the raw `--format` value exactly as typed, for validation.
 *
 * Unlike {@link parseGlobalFlags} this does not normalize — the caller decides
 * how to reject an unknown value. A bare `--format` with no following value is
 * reported as `""` (not `undefined`) so it is rejected rather than silently
 * falling through.
 *
 * @param argv - Raw argv (the user's arguments).
 * @returns The raw value, `""` for a valueless `--format`, or `undefined`.
 */
export function readRawFormat(argv: readonly string[]): string | undefined {
  const equalsArg = argv.find((arg) => arg.startsWith("--format="));
  if (equalsArg !== undefined) return equalsArg.slice("--format=".length);

  const spaceIndex = argv.indexOf("--format");
  if (spaceIndex === -1) return undefined;

  const value = argv[spaceIndex + 1];
  return value !== undefined && !value.startsWith("-") ? value : "";
}

/**
 * Environment probe for the auto-LLM default. Injectable so detection can be
 * unit-tested without touching the real process.
 */
export interface OutputEnvironment {
  /** Whether stdout is attached to an interactive terminal. */
  readonly isTty: boolean;
  /** Whether the auto-LLM default is explicitly disabled. */
  readonly noAutoLlm: boolean;
}

/** Read the real stdout/env output environment. @note Impure — reads process. */
function readOutputEnvironment(): OutputEnvironment {
  return {
    isTty: process.stdout.isTTY === true,
    noAutoLlm: Boolean(process.env.PRAGMA_NO_AUTO_LLM),
  };
}

/** Narrow a raw `--detail` value to a recognized level, else `undefined`. */
function readDetail(argv: readonly string[]): DetailLevel | undefined {
  const raw = readFlagValue(argv, "--detail");
  if (raw !== undefined && (DETAIL_LEVELS as readonly string[]).includes(raw)) {
    return raw as DetailLevel;
  }
  return undefined;
}

/**
 * Extract the global flags from raw argv (the user's arguments, argv[2:]).
 *
 * Auto-LLM: with no explicit `--format` and a non-interactive stdout (piped or
 * redirected — the shape an agent captures), `llm` defaults to true so agents
 * get condensed Markdown without a flag. Any explicit `--format` overrides it —
 * `--format plain` forces human output down a pipe, `--format llm` forces the
 * condensed form even on a TTY — as does `PRAGMA_NO_AUTO_LLM`.
 *
 * @param argv - The user's arguments (no `node`/script prefix).
 * @param env - Output environment probe (defaults to the real process).
 * @returns The parsed global flags.
 * @note Impure by default — reads process.stdout/env unless `env` is injected.
 */
export function parseGlobalFlags(
  argv: readonly string[],
  env: OutputEnvironment = readOutputEnvironment(),
): GlobalFlags {
  const rawFormat = readFlagValue(argv, "--format");
  const format =
    rawFormat === "json" ? "json" : rawFormat === "llm" ? "llm" : "plain";
  const formatRequested = rawFormat !== undefined;
  const autoLlm = !formatRequested && !env.isTty && !env.noAutoLlm;
  const detail = readDetail(argv);
  return {
    llm: format === "llm" || autoLlm,
    autoLlm,
    format,
    verbose: argv.includes("--verbose"),
    ...(detail !== undefined ? { detail } : {}),
  };
}

/**
 * Return a copy of argv with every global flag (and its value) removed.
 *
 * Since {@link parseGlobalFlags} pre-parses these, they are dropped so they do
 * not collide with Commander's positional scoping, letting the user place them
 * anywhere on the line.
 *
 * @param argv - The user's arguments.
 * @returns A new array with global flags stripped.
 */
export function stripGlobalFlags(argv: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--verbose") continue;
    if (
      arg?.startsWith("--format=") ||
      arg?.startsWith("--verbose=") ||
      arg?.startsWith("--detail=")
    ) {
      continue;
    }
    if (arg === "--format" || arg === "--detail") {
      i += 1; // skip the space-form value too
      continue;
    }
    result.push(arg as string);
  }
  return result;
}
