import type { GlobalFlags } from "@canonical/cli-core";

/**
 * Read the value of a `--flag` that accepts both the space form
 * (`--flag value`) and the equals form (`--flag=value`).
 *
 * @param argv - Raw process.argv array.
 * @param flag - The flag name including leading dashes (e.g. `--format`).
 * @returns The flag's value, or undefined when the flag is absent.
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
 * Read the raw `--format` value exactly as the user typed it (both space and
 * equals forms), for validation. Unlike {@link parseGlobalFlags}, this does not
 * coerce unknown values to `text` — the caller decides how to reject them.
 *
 * A bare `--format` with no following value (either at the end of argv or
 * immediately followed by another flag) is reported as an empty string rather
 * than `undefined`, so the caller rejects it as invalid input instead of
 * silently falling through to the root-help path with exit code 0.
 *
 * @param argv - Raw process.argv array.
 * @returns The raw format value, an empty string when `--format` is present
 *   without a value, or undefined when `--format` is absent.
 */
export function readRawFormat(argv: readonly string[]): string | undefined {
  const equalsArg = argv.find((arg) => arg.startsWith("--format="));
  if (equalsArg !== undefined) return equalsArg.slice("--format=".length);

  const spaceIndex = argv.indexOf("--format");
  if (spaceIndex === -1) return undefined;

  const value = argv[spaceIndex + 1];
  // A missing value or another flag means the user gave no format at all.
  return value !== undefined && !value.startsWith("-") ? value : "";
}

/**
 * Environment probe used to decide the auto-LLM default. Injectable so the
 * detection can be unit-tested without touching the real process.
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

/**
 * Extract global flags (--llm, --format, --verbose) from raw argv.
 *
 * Performs simple scanning rather than full argument parsing so it can run
 * before Commander processes the command tree. Recognises both the space form
 * (`--format json`) and the equals form (`--format=json`).
 *
 * Auto-LLM: when no `--llm`/`--format` is given and stdout is not an
 * interactive terminal (piped or redirected — the shape an agent captures),
 * `llm` defaults to true so agents get condensed Markdown without passing a
 * flag. Interactive terminals stay in rich mode. `--llm`, `--format json`, and
 * `PRAGMA_NO_AUTO_LLM` all override this.
 *
 * @param argv - Raw process.argv array.
 * @param env - Output environment probe (defaults to the real process).
 * @returns Parsed global flags.
 * @note Impure by default — reads process.stdout/env unless `env` is injected.
 */
export default function parseGlobalFlags(
  argv: readonly string[],
  env: OutputEnvironment = readOutputEnvironment(),
): GlobalFlags {
  const explicitLlm = argv.includes("--llm");
  const format = readFlagValue(argv, "--format") === "json" ? "json" : "text";
  const formatRequested = readFlagValue(argv, "--format") !== undefined;
  const autoLlm =
    !explicitLlm && !formatRequested && !env.isTty && !env.noAutoLlm;
  return {
    llm: explicitLlm || autoLlm,
    format,
    verbose: argv.includes("--verbose"),
  };
}

/**
 * Return a copy of argv with global flags stripped out.
 *
 * Since {@link parseGlobalFlags} pre-parses these flags before Commander
 * runs, we remove them so they don't collide with Commander's
 * `enablePositionalOptions()` scoping. This lets users place `--llm`,
 * `--format`, and `--verbose` anywhere in the command line.
 *
 * @param argv - Raw process.argv array.
 * @returns New array with global flags removed.
 */
export function stripGlobalFlags(argv: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--llm" || arg === "--verbose") continue;
    // Equals form (`--format=json`, `--llm=…`) is a single token — drop it.
    if (
      arg?.startsWith("--format=") ||
      arg?.startsWith("--llm=") ||
      arg?.startsWith("--verbose=")
    ) {
      continue;
    }
    if (arg === "--format") {
      i += 1; // skip the space-form value too
      continue;
    }
    result.push(arg as string);
  }
  return result;
}
