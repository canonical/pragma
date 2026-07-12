import {
  type CommandDefinition,
  type CommandResult,
  createExitResult,
  createOutputResult,
} from "@canonical/cli-core";
import { selectFormatter } from "../../shared/formatters.js";
import { reportFormatters } from "../formatters/index.js";
import { gatherSources, parsePrefixes } from "../helpers/index.js";
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
      description:
        "TTL files or globs (default: the configured semantic packages)",
      type: "multiselect",
      positional: true,
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
    const sources = await gatherSources(
      readStringArray(params.sources),
      ctx.cwd,
    );
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
