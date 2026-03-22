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
