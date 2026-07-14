import type { GlobalFlags } from "@canonical/cli-core";
import { CommanderError } from "commander";
import { PROGRAM_NAME } from "../constants.js";
import { commands as createCommands } from "../domains/create/index.js";
import { commands as graphqlCommands } from "../domains/graphql/index.js";
import { buildCapabilitiesCommand } from "../domains/llm/index.js";
import { commands as refsCommands } from "../domains/refs/index.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import createInteractivePromptSession from "../domains/shared/createInteractivePromptSession.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import { commands as traceCommands } from "../domains/trace/index.js";
import { PragmaError } from "../error/index.js";
import collectCommands from "./collectCommands.js";
import createProgram from "./createProgram.js";
import mapExitCode from "./mapExitCode.js";
import parseGlobalFlags, {
  readRawFormat,
  stripGlobalFlags,
} from "./parseGlobalFlags.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";
import resolveCommandKind from "./resolveCommandKind.js";

function hasCommandArg(argv: readonly string[]): boolean {
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

    return true;
  }

  return false;
}

// — Helpers ———————————————————————————————————————————————————————————————————

function renderError(error: PragmaError, flags: GlobalFlags): string {
  if (flags.format === "json") return renderErrorJson(error);
  if (flags.llm) return renderErrorLlm(error);
  return renderErrorPlain(error);
}

// — Stage 3: Handle early-exit command kinds ——————————————————————————————————

async function handleCompletionsClient(partial: string): Promise<void> {
  const { default: queryCompletions } = await import(
    "../completions/queryCompletions.js"
  );
  await queryCompletions(partial);
}

async function handleCompletionsServer(): Promise<void> {
  const { default: startCompletionsServer } = await import(
    "../completions/startCompletionsServer.js"
  );
  await startCompletionsServer();
}

async function handleDoctor(
  argv: readonly string[],
  globalFlags: GlobalFlags,
): Promise<void> {
  const { doctorCommand } = await import("../domains/doctor/commands/index.js");

  // `doctor` runs before Commander, so honour --help/-h here rather than
  // executing the health check when the user only asked for usage.
  const wantsHelp = argv
    .slice(2)
    .some((arg) => arg === "--help" || arg === "-h");
  if (wantsHelp) {
    const { formatVerbHelp } = await import("@canonical/cli-core");
    process.stdout.write(`${formatVerbHelp(PROGRAM_NAME, doctorCommand)}\n`);
    return;
  }

  const ctx = { cwd: process.cwd(), globalFlags };
  const result = await doctorCommand.execute({}, ctx);
  if (result.tag === "output") {
    process.stdout.write(`${result.render.plain(result.value)}\n`);
  }
}

async function handleRootHelp(globalFlags: GlobalFlags): Promise<void> {
  const stubCtx: PragmaContext = {
    store: {} as PragmaRuntime["store"],
    ...(await resolveHelpConfig()),
    cwd: process.cwd(),
    dispose: () => {},
    globalFlags,
    promptSession: createInteractivePromptSession,
  };
  const commands = collectCommands(stubCtx);
  const program = createProgram(commands, stubCtx);

  try {
    await program.parseAsync(["node", "pragma", "--help"]);
  } catch (err) {
    handleProgramError(err, globalFlags);
  }
}

/**
 * Resolve config and packages for root help without booting the store.
 *
 * Story-pack nouns come from config and package files, so bare
 * `pragma --help` reads them via the filesystem loaders only. Help must
 * never fail on a broken config — errors fall back to the empty stub and
 * surface on the next real command instead.
 *
 * @note Impure — reads config and resolves packages from disk.
 */
async function resolveHelpConfig(): Promise<
  Pick<PragmaRuntime, "config" | "packages">
> {
  try {
    const { readConfig } = await import("#config");
    const config = readConfig(process.cwd());
    const { resolveSemanticPackages } = await import(
      "../domains/shared/semanticPackage.js"
    );
    const { createGitLoader, createLocalLoader } = await import(
      "../domains/shared/loaders/index.js"
    );
    const { mergeAndParseRefs } = await import(
      "../domains/shared/mergeAndParseRefs.js"
    );
    const packages = await resolveSemanticPackages(
      mergeAndParseRefs(config.packages),
      [createLocalLoader(), createGitLoader()],
    );
    return { config, packages };
  } catch {
    return { config: { tier: undefined, channel: "normal" }, packages: [] };
  }
}

// — Stage 4+5: Boot, build program, execute ——————————————————————————————————

async function bootAndRun(
  argv: readonly string[],
  globalFlags: GlobalFlags,
): Promise<void> {
  let runtime: PragmaRuntime | undefined;
  try {
    runtime = await bootPragma();
  } catch (err) {
    const pragmaErr =
      err instanceof PragmaError
        ? err
        : PragmaError.storeError(
            err instanceof Error ? err.message : String(err),
          );
    process.stderr.write(`${renderError(pragmaErr, globalFlags)}\n`);
    process.exitCode = mapExitCode(pragmaErr.code);
    return;
  }

  try {
    const ctx: PragmaContext = {
      ...runtime,
      globalFlags,
      promptSession: createInteractivePromptSession,
    };
    const commands = collectCommands(ctx);
    const program = createProgram(commands, ctx);
    await program.parseAsync(stripGlobalFlags(argv));
  } catch (err) {
    handleProgramError(err, globalFlags);
  } finally {
    runtime.dispose();
  }
}

async function runStoreSkip(
  argv: readonly string[],
  globalFlags: GlobalFlags,
): Promise<void> {
  const stubCtx: PragmaContext = {
    store: {} as PragmaRuntime["store"],
    config: { tier: undefined, channel: "normal" },
    cwd: process.cwd(),
    packages: [],
    dispose: () => {},
    globalFlags,
    promptSession: createInteractivePromptSession,
  };
  const commands = [
    ...setupCommands(),
    ...refsCommands(),
    ...traceCommands(),
    ...graphqlCommands(),
    ...createCommands(),
    buildCapabilitiesCommand(),
  ];
  const program = createProgram(commands, stubCtx);

  try {
    await program.parseAsync(stripGlobalFlags(argv));
  } catch (err) {
    handleProgramError(err, globalFlags);
  }
}

function handleProgramError(err: unknown, globalFlags: GlobalFlags): void {
  if (err instanceof CommanderError) {
    if (
      err.code === "commander.helpDisplayed" ||
      err.code === "commander.version"
    ) {
      process.exitCode = 0;
      return;
    }
    process.exitCode = err.exitCode;
    return;
  }

  if (err instanceof PragmaError) {
    process.stderr.write(`${renderError(err, globalFlags)}\n`);
    process.exitCode = mapExitCode(err.code);
    return;
  }

  const wrapped = PragmaError.internalError(
    err instanceof Error ? err.message : String(err),
  );
  process.stderr.write(`${renderError(wrapped, globalFlags)}\n`);
  process.exitCode = 127;
}

// — Main orchestrator —————————————————————————————————————————————————————————

/**
 * Main CLI orchestrator.
 *
 * Pipeline stages:
 * 1. `parseGlobalFlags(argv)`
 * 2. `resolveCommandKind(argv)`
 * 3. Pattern match on kind -- early exit or `bootPragma()`
 * 4. `collectCommands(ctx)` + `createProgram(commands, ctx)`
 * 5. `program.parseAsync(argv)` with error handling + dispose
 *
 * @param argv - The raw process.argv array.
 *
 * @note Impure
 */
export default async function runCli(argv: readonly string[]): Promise<void> {
  const globalFlags = parseGlobalFlags(argv);

  const commandKind = resolveCommandKind(argv);

  // Completion queries must be handled before the root-help shortcut:
  // `pragma --completions` (empty first-Tab partial) has no non-flag command
  // arg, so it would otherwise fall through to root help and dump the help
  // banner into the shell's completion buffer.
  if (commandKind.kind === "completions-client") {
    return handleCompletionsClient(commandKind.partial);
  }
  if (commandKind.kind === "completions-server") {
    return handleCompletionsServer();
  }

  // Reject an unknown --format value early (completion queries are exempt above,
  // so tab-completion never errors). Only text/json are supported.
  const rawFormat = readRawFormat(argv);
  if (rawFormat !== undefined && rawFormat !== "text" && rawFormat !== "json") {
    const error = PragmaError.invalidInput("format", rawFormat, {
      validOptions: ["text", "json"],
    });
    process.stderr.write(`${renderError(error, globalFlags)}\n`);
    process.exitCode = mapExitCode(error.code);
    return;
  }

  const explicitHelpOrVersion = argv
    .slice(2)
    .some(
      (arg) =>
        arg === "--help" || arg === "-h" || arg === "--version" || arg === "-V",
    );

  if (!hasCommandArg(argv) && !explicitHelpOrVersion) {
    return handleRootHelp(globalFlags);
  }

  switch (commandKind.kind) {
    case "doctor":
      return handleDoctor(argv, globalFlags);
    case "store-skip":
      return runStoreSkip(argv, globalFlags);
    case "store-required":
      return bootAndRun(argv, globalFlags);
  }
}
