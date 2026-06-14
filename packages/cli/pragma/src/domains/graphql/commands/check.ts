import {
  type CommandDefinition,
  type CommandResult,
  createExitResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { selectFormatter } from "../../shared/formatters.js";
import { reportFormatters } from "../formatters/index.js";
import { parsePrefixes } from "../helpers/index.js";
import { compileSchema } from "../operations/index.js";
import type { GraphqlCompileReport } from "../types.js";

/** Narrow an unknown param to a string array. */
function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Builds the `pragma graphql check` command definition.
 *
 * Runs the same compile as `graphql build` but writes no artifacts —
 * a CI gate. Prints all compiler diagnostics and exits non-zero when
 * compilation fails or any error-severity diagnostic is produced.
 */
const checkCommand: CommandDefinition = {
  path: ["graphql", "check"],
  description: "Compile TTL sources and fail on error diagnostics",
  parameters: [
    {
      name: "sources",
      description: "TTL source files or glob patterns",
      type: "multiselect",
      positional: true,
      required: true,
    },
    {
      name: "prefix",
      description: "Ontology prefix as name=namespace (repeatable)",
      type: "multiselect",
    },
  ],
  meta: {
    examples: [
      "pragma graphql check ontology.ttl",
      'pragma graphql check "data/*.ttl" --prefix ds=https://ds.canonical.com/',
    ],
  },
  async execute(params, ctx): Promise<CommandResult> {
    const sources = readStringArray(params.sources);
    if (sources.length === 0) {
      throw PragmaError.invalidInput("sources", "(empty)", {
        recovery: {
          message: "Provide at least one TTL file or glob pattern.",
        },
      });
    }

    const prefixes = parsePrefixes(readStringArray(params.prefix));
    const outcome = await compileSchema({ sources, prefixes, cwd: ctx.cwd });

    const report: GraphqlCompileReport = {
      diagnostics: outcome.diagnostics,
      files: outcome.files,
      sourcesHash: outcome.sourcesHash,
    };

    const hasErrors =
      outcome.status === "failed" ||
      outcome.diagnostics.some((d) => d.severity === "error");

    if (hasErrors) {
      process.stdout.write(
        `${selectFormatter(ctx, reportFormatters)(report)}\n`,
      );
      return createExitResult(1);
    }

    return createOutputResult(report, {
      plain: selectFormatter(ctx, reportFormatters),
    });
  },
};

export default checkCommand;
