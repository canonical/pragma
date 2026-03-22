/**
 * Main CLI entry point.
 *
 * Pipeline stages:
 * 1. parseGlobalFlags(argv)
 * 2. resolveCommandKind(argv)
 * 3. Pattern match on kind → early exit or bootPragma()
 * 4. collectCommands(ctx) + createProgram(commands, ctx)
 * 5. program.parseAsync(argv) with error handling + dispose
 *
 * @note Impure — boots ke store, reads config, writes to stdout/stderr, sets exit code.
 */

import {
  type CommandDefinition,
  formatHelp,
  formatLlmHelp,
  type GlobalFlags,
  registerAll,
} from "@canonical/cli-core";
import { Command, CommanderError } from "commander";
import { PROGRAM_DESCRIPTION, PROGRAM_NAME, VERSION } from "../constants.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import { PragmaError } from "../error/index.js";
import collectCommands from "./collectCommands.js";
import { mapExitCode } from "./mapExitCode.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";
import resolveCommandKind from "./resolveCommandKind.js";

// — Stage 1: Parse global flags ——————————————————————————————————————————————

function parseGlobalFlags(argv: readonly string[]): GlobalFlags {
  return {
    llm: argv.includes("--llm"),
    format:
      argv.includes("--format") && argv[argv.indexOf("--format") + 1] === "json"
        ? "json"
        : "text",
    verbose: argv.includes("--verbose"),
  };
}

// — Helpers ———————————————————————————————————————————————————————————————————

function renderError(error: PragmaError, flags: GlobalFlags): string {
  if (flags.format === "json") return renderErrorJson(error);
  if (flags.llm) return renderErrorLlm(error);
  return renderErrorPlain(error);
}

function createProgram(
  commands: readonly CommandDefinition[],
  ctx: PragmaContext,
): Command {
  const program = new Command();
  program.name(PROGRAM_NAME);
  program.version(VERSION, "-V, --version");
  program.description(PROGRAM_DESCRIPTION);
  program.exitOverride();
  program.configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(str),
  });

  program.option(
    "--llm",
    "Condensed Markdown output for LLM consumption",
    false,
  );
  program.option("--format <type>", "Output format (text or json)", "text");
  program.option("--verbose", "Diagnostic output to stderr", false);

  program.addHelpText("beforeAll", () => {
    if (ctx.globalFlags.llm) {
      return formatLlmHelp(PROGRAM_NAME, commands);
    }
    return formatHelp(PROGRAM_NAME, PROGRAM_DESCRIPTION, commands);
  });

  program.helpOption("-h, --help", "Show help");
  program.configureHelp({ formatHelp: () => "" });

  program
    .command("mcp")
    .description("Start the MCP server over stdio")
    .action(async () => {
      const { default: runMcpServer } = await import("../mcp/runMcpServer.js");
      await runMcpServer();
    });

  registerAll(program, commands, ctx);

  return program;
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

async function handleDoctor(globalFlags: GlobalFlags): Promise<void> {
  const { doctorCommand } = await import("../domains/doctor/commands/index.js");
  const ctx = { cwd: process.cwd(), globalFlags };
  const result = await doctorCommand.execute({}, ctx);
  if (result.tag === "output") {
    process.stdout.write(`${result.render.plain(result.value)}\n`);
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
    const ctx: PragmaContext = { ...runtime, globalFlags };
    const commands = collectCommands(ctx);
    const program = createProgram(commands, ctx);
    await program.parseAsync(argv);
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
    dispose: () => {},
    globalFlags,
  };
  const commands = [...setupCommands()];
  const program = createProgram(commands, stubCtx);

  try {
    await program.parseAsync(argv);
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

async function runCli(argv: readonly string[]): Promise<void> {
  const globalFlags = parseGlobalFlags(argv);
  const commandKind = resolveCommandKind(argv);

  switch (commandKind.kind) {
    case "completions-client":
      return handleCompletionsClient(commandKind.partial);
    case "completions-server":
      return handleCompletionsServer();
    case "doctor":
      return handleDoctor(globalFlags);
    case "store-skip":
      return runStoreSkip(argv, globalFlags);
    case "store-required":
      return bootAndRun(argv, globalFlags);
  }
}

export { createProgram, parseGlobalFlags, runCli };
