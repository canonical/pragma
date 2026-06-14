import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type CommandDefinition,
  type CommandResult,
  createExitResult,
  createOutputResult,
} from "@canonical/cli-core";
import { serializeExtraction } from "@canonical/ke-graphql";
import { selectFormatter } from "../../shared/formatters.js";
import { reportFormatters } from "../formatters/index.js";
import { gatherSources, parsePrefixes } from "../helpers/index.js";
import { compileSchema } from "../operations/index.js";
import type { GraphqlCompileReport } from "../types.js";

const DEFAULT_SDL_PATH = "./schema.graphql";
const DEFAULT_EXTRACTION_PATH = "./extraction.json";

/** Narrow an unknown param to a string array. */
function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Builds the `pragma graphql build` command definition.
 *
 * Compiles TTL sources into a GraphQL schema, writes the SDL and the
 * extraction artifact, and prints all compiler diagnostics. Exits
 * non-zero when schema composition fails.
 */
const buildCommand: CommandDefinition = {
  path: ["graphql", "build"],
  description: "Compile TTL sources into GraphQL schema artifacts",
  parameters: [
    {
      name: "sources",
      description:
        "TTL files or globs (default: the configured semantic packages)",
      type: "multiselect",
      positional: true,
    },
    {
      name: "sdl",
      description: "Output path for the GraphQL SDL",
      type: "string",
      default: DEFAULT_SDL_PATH,
    },
    {
      name: "extraction",
      description: "Output path for the extraction artifact",
      type: "string",
      default: DEFAULT_EXTRACTION_PATH,
    },
    {
      name: "prefix",
      description: "Ontology prefix as name=namespace (repeatable)",
      type: "multiselect",
    },
  ],
  meta: {
    examples: [
      "pragma graphql build ontology.ttl",
      'pragma graphql build "data/*.ttl" --sdl out/schema.graphql --extraction out/extraction.json',
      "pragma graphql build ontology.ttl --prefix ds=https://ds.canonical.com/",
    ],
  },
  async execute(params, ctx): Promise<CommandResult> {
    const sources = await gatherSources(
      readStringArray(params.sources),
      ctx.cwd,
    );
    const prefixes = parsePrefixes(readStringArray(params.prefix));
    const outcome = await compileSchema({ sources, prefixes, cwd: ctx.cwd });
    const format = selectFormatter(ctx, reportFormatters);

    if (outcome.status === "failed" || !outcome.compiled) {
      const report: GraphqlCompileReport = {
        diagnostics: outcome.diagnostics,
        files: outcome.files,
        sourcesHash: outcome.sourcesHash,
      };
      process.stdout.write(`${format(report)}\n`);
      return createExitResult(1);
    }

    const sdlPath = resolve(
      ctx.cwd,
      typeof params.sdl === "string" ? params.sdl : DEFAULT_SDL_PATH,
    );
    const extractionPath = resolve(
      ctx.cwd,
      typeof params.extraction === "string"
        ? params.extraction
        : DEFAULT_EXTRACTION_PATH,
    );

    mkdirSync(dirname(sdlPath), { recursive: true });
    writeFileSync(sdlPath, outcome.compiled.sdl, "utf-8");
    mkdirSync(dirname(extractionPath), { recursive: true });
    writeFileSync(
      extractionPath,
      serializeExtraction(outcome.compiled.extraction, outcome.sourcesHash),
      "utf-8",
    );

    const report: GraphqlCompileReport = {
      diagnostics: outcome.diagnostics,
      files: outcome.files,
      sourcesHash: outcome.sourcesHash,
      artifacts: { sdl: sdlPath, extraction: extractionPath },
    };

    return createOutputResult(report, { plain: format });
  },
};

export default buildCommand;
