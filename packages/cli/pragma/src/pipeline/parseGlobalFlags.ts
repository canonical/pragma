import type { GlobalFlags } from "@canonical/cli-core";

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
