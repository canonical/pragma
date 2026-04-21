import type { GlobalFlags } from "@canonical/cli-core";
import { CommanderError } from "commander";
import { commands as refsCommands } from "../domains/refs/index.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import { PragmaError } from "../error/index.js";
import collectCommands from "./collectCommands.js";
import createProgram from "./createProgram.js";
import mapExitCode from "./mapExitCode.js";
import parseGlobalFlags, { stripGlobalFlags } from "./parseGlobalFlags.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";
import resolveCommandKind from "./resolveCommandKind.js";
import runInteractiveCommand from "./runInteractiveCommand.js";

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

async function handleDoctor(globalFlags: GlobalFlags): Promise<void> {
  const { doctorCommand } = await import("../domains/doctor/commands/index.js");
  const ctx = { cwd: process.cwd(), globalFlags };
  const result = await doctorCommand.execute({}, ctx);
  if (result.tag === "output") {
    process.stdout.write(`${result.render.plain(result.value)}\n`);
  }
}

async function handleRootHelp(globalFlags: GlobalFlags): Promise<void> {
  const stubCtx: PragmaContext = {
    store: {} as PragmaRuntime["store"],
    config: { tier: undefined, channel: "normal" },
    cwd: process.cwd(),
    dispose: () => {},
    globalFlags,
    interactive: runInteractiveCommand,
  };
  const commands = collectCommands(stubCtx);
  const program = createProgram(commands, stubCtx);

  try {
    await program.parseAsync(["node", "pragma", "--help"]);
  } catch (err) {
    handleProgramError(err, globalFlags);
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
      interactive: runInteractiveCommand,
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
    dispose: () => {},
    globalFlags,
    interactive: runInteractiveCommand,
  };
  const commands = [...setupCommands(), ...refsCommands()];
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
  const explicitHelpOrVersion = argv
    .slice(2)
    .some(
      (arg) =>
        arg === "--help" || arg === "-h" || arg === "--version" || arg === "-V",
    );

  if (!hasCommandArg(argv) && !explicitHelpOrVersion) {
    return handleRootHelp(globalFlags);
  }

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
