import {
  type CommandDefinition,
  formatHelp,
  formatLlmHelp,
  registerAll,
} from "@canonical/cli-core";
import { Command } from "commander";
import { PROGRAM_DESCRIPTION, PROGRAM_NAME, VERSION } from "../constants.js";
import type { PragmaContext } from "../domains/shared/context.js";

/**
 * Build and configure the top-level Commander program.
 *
 * Registers all domain commands, global flags, help formatting,
 * and the `mcp` subcommand. Returns the configured Commander instance
 * ready for `parseAsync`.
 *
 * @param commands - Domain command definitions to register.
 * @param ctx - Shared pragma context (global flags, store, config).
 * @returns Configured Commander program.
 *
 * @note Impure — attaches process.stdout/stderr handlers and lazy-imports the MCP server.
 */
export default function createProgram(
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

  program.addHelpText("beforeAll", (_ctx) => {
    // Only show root-level help when the help is for the root program itself.
    // Subcommand help is handled by registerAll via formatNounHelp/formatVerbHelp.
    if (_ctx.command !== program) return "";
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
