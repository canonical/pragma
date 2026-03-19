import {
  type CommandContext,
  type CommandDefinition,
  formatHelp,
  formatLlmHelp,
  type GlobalFlags,
  registerAll,
} from "@canonical/cli-core";
import { Command, CommanderError } from "commander";
import { readConfig } from "../config.js";
import { PROGRAM_DESCRIPTION, PROGRAM_NAME, VERSION } from "../constants.js";
import { collectConfigCommands } from "../domains/config/commands.js";
import collectStandardCommands from "../domains/standard/collectStandardCommands.js";
import { PragmaError } from "../error/index.js";
import { mapExitCode } from "./mapExitCode.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";

function collectCommands(): CommandDefinition[] {
  return [...collectConfigCommands(), ...collectStandardCommands()];
}

function createProgram(
  commands: readonly CommandDefinition[],
  ctx: CommandContext,
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
      const { runMcpServer } = await import("../mcp/runMcpServer.js");
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

async function runCli(argv: readonly string[]): Promise<void> {
  const globalFlags = parseGlobalFlags(argv);

  let cwd: string;
  try {
    const config = readConfig();
    cwd = process.cwd();
    if (globalFlags.verbose) {
      const tier = config.tier ?? "(none)";
      process.stderr.write(`Config: tier=${tier} channel=${config.channel}\n`);
    }
  } catch (err) {
    const pragmaErr =
      err instanceof PragmaError
        ? err
        : PragmaError.configError(
            err instanceof Error ? err.message : String(err),
          );
    process.stderr.write(`${renderError(pragmaErr, globalFlags)}\n`);
    process.exitCode = mapExitCode(pragmaErr.code);
    return;
  }

  const ctx: CommandContext = { cwd, globalFlags };
  const commands = collectCommands();
  const program = createProgram(commands, ctx);

  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof CommanderError) {
      if (
        err.code === "commander.helpDisplayed" ||
        err.code === "commander.version"
      ) {
        process.exitCode = 0;
        return;
      }
      // Commander already wrote the error via configureOutput.writeErr,
      // so just set the exit code without re-printing.
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
}

export { collectCommands, createProgram, parseGlobalFlags, runCli };
