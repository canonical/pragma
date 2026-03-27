import type { GlobalFlags } from "@canonical/cli-core";

/**
 * Extract global flags (--llm, --format, --verbose) from raw argv.
 *
 * Performs simple indexOf scanning rather than full argument parsing
 * so it can run before Commander processes the command tree.
 *
 * @param argv - Raw process.argv array.
 * @returns Parsed global flags.
 */
export default function parseGlobalFlags(argv: readonly string[]): GlobalFlags {
  return {
    llm: argv.includes("--llm"),
    format:
      argv.includes("--format") && argv[argv.indexOf("--format") + 1] === "json"
        ? "json"
        : "text",
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
    if (arg === "--format") {
      i += 1; // skip the value too
      continue;
    }
    result.push(arg as string);
  }
  return result;
}
