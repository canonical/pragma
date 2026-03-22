import {
  type CommandDefinition,
  formatHelp,
  formatLlmHelp,
  type GlobalFlags,
  registerAll,
} from "@canonical/cli-core";
import { Command, CommanderError } from "commander";
import { PROGRAM_DESCRIPTION, PROGRAM_NAME, VERSION } from "../constants.js";
import { commands as componentCommands } from "../domains/component/index.js";
import { commands as configCommands } from "../domains/config/index.js";
import { commands as createCommands } from "../domains/create/index.js";
import { doctorCommand } from "../domains/doctor/commands/index.js";
import infoCommand from "../domains/info/infoCommand.js";
import upgradeCommand from "../domains/info/upgradeCommand.js";
import buildLlmCommand from "../domains/llm/llmCommand.js";
import { commands as modifierCommands } from "../domains/modifier/index.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import { commands as skillCommands } from "../domains/skill/index.js";
import { commands as standardCommands } from "../domains/standard/index.js";
import { commands as tierCommands } from "../domains/tier/index.js";
import { commands as tokenCommands } from "../domains/token/index.js";
import { PragmaError } from "../error/index.js";
import { mapExitCode } from "./mapExitCode.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";

function collectCommands(ctx: PragmaContext): CommandDefinition[] {
  return [
    ...configCommands(ctx),
    ...createCommands(),
    ...setupCommands(),
    ...standardCommands(ctx),
    ...modifierCommands(ctx),
    ...tierCommands(ctx),
    ...tokenCommands(ctx),
    ...componentCommands(ctx),
    ...skillCommands(ctx),
    doctorCommand,
    infoCommand,
    upgradeCommand,
    buildLlmCommand(ctx),
  ];
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

function renderError(error: PragmaError, flags: GlobalFlags): string {
  if (flags.format === "json") {
    return renderErrorJson(error);
  }
  if (flags.llm) {
    return renderErrorLlm(error);
  }
  return renderErrorPlain(error);
}

/**
 * Main CLI entry point — parses argv, boots runtime, runs command, disposes.
 *
 * @note Impure — boots ke store, reads config, writes to stdout/stderr, sets exit code.
 */
async function runCli(argv: readonly string[]): Promise<void> {
  const globalFlags = parseGlobalFlags(argv);

  // Completions client — intercept before store boot.
  // The client manages server lifecycle independently.
  const completionsIdx = argv.indexOf("--completions");
  if (completionsIdx !== -1) {
    const partial = argv.slice(completionsIdx + 1).join(" ");
    const { default: queryCompletions } = await import(
      "../completions/queryCompletions.js"
    );
    await queryCompletions(partial);
    return;
  }

  const commandArg = argv.slice(2).find((a) => !a.startsWith("-"));

  // Completions server — boots its own store with cache.
  if (commandArg === "_completions-server") {
    const { default: startCompletionsServer } = await import(
      "../completions/startCompletionsServer.js"
    );
    await startCompletionsServer();
    return;
  }

  // Doctor runs before store boot — it validates the environment itself.
  if (commandArg === "doctor") {
    const { doctorCommand } = await import(
      "../domains/doctor/commands/index.js"
    );
    const ctx = { cwd: process.cwd(), globalFlags };
    const result = await doctorCommand.execute({}, ctx);
    if (result.tag === "output") {
      const render = result.render.plain;
      process.stdout.write(`${render(result.value)}\n`);
    }
    return;
  }

  // Setup and MCP commands don't need the ke store — skip boot for them
  const needsStore = !argv.includes("setup") && !argv.includes("mcp");

  let runtime: PragmaRuntime | undefined;
  try {
    if (needsStore) {
      runtime = await bootPragma();
    }
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
    if (runtime) {
      const ctx: PragmaContext = { ...runtime, globalFlags };
      const commands = collectCommands(ctx);
      const program = createProgram(commands, ctx);
      await program.parseAsync(argv);
    } else {
      // Store-skip path: only setup commands available
      const stubCtx: PragmaContext = {
        store: {} as PragmaRuntime["store"],
        config: { tier: undefined, channel: "normal" },
        cwd: process.cwd(),
        dispose: () => {},
        globalFlags,
      };
      const commands = [...setupCommands()];
      const program = createProgram(commands, stubCtx);
      await program.parseAsync(argv);
    }
  } catch (err) {
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
  } finally {
    runtime?.dispose();
  }
}

export { collectCommands, createProgram, parseGlobalFlags, runCli };
