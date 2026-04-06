/**
 * Register all command definitions into a Commander program.
 *
 * The federation pattern: each domain exports CommandDefinition[], the root
 * concatenates them and calls registerAll to wire into a Commander program.
 */

import { Command, type OptionValues } from "commander";
import { convertCamelToKebab } from "./convertCase.js";
import { formatNounHelp, formatVerbHelp } from "./help.js";
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
  HandleResultOptions,
  InteractiveSpec,
  ParameterDefinition,
} from "./types.js";

/**
 * Convert a ParameterDefinition to Commander flag syntax.
 *
 * - boolean → `--flag-name`
 * - string/select → `--flag-name <value>`
 * - multiselect → `--flag-name <values...>`
 */
export function convertParameterToFlag(param: ParameterDefinition): string {
  const kebab = convertCamelToKebab(param.name);
  switch (param.type) {
    case "boolean":
      return `--${kebab}`;
    case "multiselect":
      return `--${kebab} <values...>`;
    default:
      return `--${kebab} <value>`;
  }
}

/**
 * Extract parsed parameters from Commander's option values,
 * mapping positional arguments and applying defaults.
 */
export function extractParams(
  opts: OptionValues,
  args: string[],
  parameters: readonly ParameterDefinition[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const param of parameters) {
    if (param.positional) continue;
    const value = opts[param.name];
    if (value !== undefined) {
      result[param.name] = value;
    } else if (param.default !== undefined) {
      result[param.name] = param.default;
    }
  }

  const positionals = parameters.filter((p) => p.positional);
  for (let i = 0; i < positionals.length && i < args.length; i++) {
    const param = positionals[i];
    /* v8 ignore next — structurally guaranteed by loop bounds */
    if (!param) throw new Error(`Expected positional parameter at index ${i}`);
    const isLastPositional = i === positionals.length - 1;
    if (param.type === "multiselect" && isLastPositional) {
      result[param.name] = args.slice(i);
      break;
    }
    result[param.name] = args[i];
  }

  return result;
}

/**
 * Register all command definitions into a Commander program.
 *
 * Handles path-based nesting: `["component", "list"]` creates a `component`
 * parent command with a `list` subcommand. Commands sharing a parent path
 * segment are grouped under the same parent.
 */
export default function registerAll(
  program: Command,
  commands: readonly CommandDefinition[],
  ctx: CommandContext,
  resultOptions?: HandleResultOptions,
): void {
  program.enablePositionalOptions();
  const groups = new Map<string, CommandDefinition[]>();

  for (const cmd of commands) {
    if (cmd.path.length === 0) continue;
    const noun = cmd.path[0];
    /* v8 ignore next — structurally guaranteed by path.length > 0 guard above */
    if (!noun) throw new Error("Expected command path[0] to be defined");
    const existing = groups.get(noun) ?? [];
    existing.push(cmd);
    groups.set(noun, existing);
  }

  for (const [noun, cmds] of groups) {
    const singleSegment = cmds.filter((c) => c.path.length === 1);
    const multiSegment = cmds.filter((c) => c.path.length > 1);

    for (const cmd of singleSegment) {
      attachCommand(program, cmd, ctx, undefined, resultOptions);
    }

    if (multiSegment.length > 0) {
      let parent = findSubcommand(program, noun);
      if (!parent) {
        parent = program.command(noun);
        parent.description(`${noun} commands`);
      }

      parent.enablePositionalOptions();

      // Attach noun-level help (e.g. `pragma component --help`)
      const programName = program.name();
      const allCommands = commands;
      const nounParent = parent;
      parent.addHelpText("beforeAll", (_ctx) => {
        if (_ctx.command !== nounParent) return "";
        return formatNounHelp(programName, noun, allCommands);
      });
      parent.configureHelp({ formatHelp: () => "" });

      for (const cmd of multiSegment) {
        const verb = cmd.path.slice(1).join(" ");
        attachCommand(
          parent,
          { ...cmd, path: [verb] },
          ctx,
          cmd,
          resultOptions,
        );
      }
    }
  }
}

function attachCommand(
  parent: Command,
  cmd: CommandDefinition,
  ctx: CommandContext,
  originalCmd?: CommandDefinition,
  resultOptions?: HandleResultOptions,
): void {
  const name = cmd.path[cmd.path.length - 1];
  /* v8 ignore next 2 — structurally guaranteed: attachCommand only called with non-empty paths */
  if (!name)
    throw new Error("Expected command path to have at least one segment");

  const positionals = cmd.parameters.filter((p) => p.positional);
  const positionalSuffix = positionals.map(formatPositionalParam).join(" ");

  const fullName = positionalSuffix ? `${name} ${positionalSuffix}` : name;
  const sub = parent.command(fullName).description(cmd.description);
  sub.enablePositionalOptions();

  // Attach verb-level help (e.g. `pragma component list --help`)
  const helpCmd = originalCmd ?? cmd;
  const rootProgram = findRootProgram(parent);
  const verbCommand = sub;
  sub.addHelpText("beforeAll", (_ctx) => {
    /* v8 ignore next — guard for Commander help propagation to parent/sibling */
    if (_ctx.command !== verbCommand) return "";
    return formatVerbHelp(rootProgram.name(), helpCmd);
  });
  sub.configureHelp({ formatHelp: () => "" });

  for (const param of cmd.parameters) {
    if (param.positional) continue;
    const flag = convertParameterToFlag(param);
    if (param.default !== undefined) {
      sub.option(
        flag,
        param.description,
        param.default as string | boolean | string[],
      );
    } else {
      sub.option(flag, param.description);
    }
  }

  sub.action(async (...actionArgs: unknown[]) => {
    const positionalArgs: string[] = [];
    let opts: OptionValues = {};

    for (const arg of actionArgs) {
      if (typeof arg === "string") {
        positionalArgs.push(arg);
      } else if (Array.isArray(arg)) {
        positionalArgs.push(
          ...arg.filter((value): value is string => typeof value === "string"),
        );
      } else if (arg instanceof Command) {
        // skip the Command object
      } else if (typeof arg === "object" && arg !== null) {
        opts = arg as OptionValues;
      }
    }

    const params = extractParams(opts, positionalArgs, cmd.parameters);
    const result = await cmd.execute(params, ctx);
    await handleResult(result, cmd, ctx, params, resultOptions);
  });
}

/**
 * Dispatch a command result to the appropriate output channel.
 *
 * For output results: uses the ink renderer when available and mode is "ink",
 * otherwise falls back to plain text via stdout. For interactive results:
 * delegates to the binary's interactive handler when available, otherwise
 * writes an unavailable message to stderr. For exit results: sets the exit code.
 *
 * @note Impure — writes to process.stdout/stderr, sets process.exitCode,
 * and may invoke the Ink renderer or interactive handler.
 */
async function handleResult(
  result: CommandResult,
  cmd?: CommandDefinition,
  ctx?: CommandContext,
  params?: Record<string, unknown>,
  options?: HandleResultOptions,
): Promise<void> {
  switch (result.tag) {
    case "output": {
      if (options?.mode === "ink" && result.render.ink && options.renderInk) {
        const element = result.render.ink(result.value);
        await options.renderInk(element);
      } else {
        const text = result.render.plain(result.value);
        if (text) {
          writeChunked(process.stdout, `${text}\n`);
        }
      }
      break;
    }
    case "interactive": {
      if (cmd && ctx && params && ctx.interactive) {
        const rerunResult = await ctx.interactive({
          spec: result.spec,
          command: cmd,
          params,
          ctx,
        });

        if (rerunResult) {
          await handleResult(rerunResult, cmd, ctx, params, options);
          break;
        }
      }

      const message = formatInteractiveUnavailableMessage(result.spec, cmd);
      process.stderr.write(`${message}\n`);
      process.exitCode = 3;
      break;
    }
    case "exit": {
      process.exitCode = result.code;
      break;
    }
  }
}

function formatInteractiveUnavailableMessage(
  spec: InteractiveSpec,
  cmd?: CommandDefinition,
): string {
  const lines = ["Interactive mode not available in this binary."];

  /* v8 ignore next — optional `cmd` parameter guard (function signature allows undefined) */
  if (!cmd) {
    lines.push("Provide all required flags.");
    return lines.join(" ");
  }

  const missing = findMissingInteractiveParameters(spec, cmd);

  if (missing.length === 0) {
    lines.push("Provide all required flags.");
    return lines.join(" ");
  }

  lines.push("Missing required flags:");
  lines.push(
    ...missing.map((parameter) => `  ${formatParameterUsage(parameter)}`),
  );

  const example = buildInteractiveExample(spec, cmd, missing);
  lines.push("Example:");
  lines.push(`  ${example}`);

  return lines.join("\n");
}

function findMissingInteractiveParameters(
  spec: InteractiveSpec,
  cmd: CommandDefinition,
): ParameterDefinition[] {
  return spec.generator.prompts.flatMap((prompt) => {
    if (prompt.default !== undefined || prompt.name in spec.partialAnswers) {
      return [];
    }

    const parameter = cmd.parameters.find(
      (entry) => entry.name === prompt.name,
    );
    return parameter ? [parameter] : [];
  });
}

function buildInteractiveExample(
  spec: InteractiveSpec,
  cmd: CommandDefinition,
  missing: readonly ParameterDefinition[],
): string {
  const commandPath = cmd.path.join(" ");
  const providedArgs = cmd.parameters.flatMap((parameter) => {
    const value = spec.partialAnswers[parameter.name];
    if (value === undefined) {
      return [];
    }

    return formatParameterExample(parameter, value);
  });

  const missingArgs = missing.flatMap((parameter) =>
    formatParameterExample(parameter, inferExampleValue(parameter)),
  );

  return ["pragma", commandPath, ...providedArgs, ...missingArgs].join(" ");
}

function formatParameterUsage(parameter: ParameterDefinition): string {
  if (parameter.positional) {
    return formatPositionalParam(parameter);
  }

  const flag = `--${convertCamelToKebab(parameter.name)}`;
  switch (parameter.type) {
    case "boolean":
      return flag;
    case "multiselect":
      return `${flag} <values...>`;
    default:
      return `${flag} <value>`;
  }
}

function formatParameterExample(
  parameter: ParameterDefinition,
  value: unknown,
): string[] {
  if (parameter.type === "boolean") {
    return value === true && !parameter.positional
      ? [`--${convertCamelToKebab(parameter.name)}`]
      : [];
  }

  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  if (parameter.positional) {
    return values;
  }

  return [`--${convertCamelToKebab(parameter.name)}`, ...values];
}

function inferExampleValue(
  parameter: ParameterDefinition,
): string | string[] | boolean {
  switch (parameter.type) {
    case "boolean":
      return true;
    case "multiselect":
      return [
        inferExampleScalar(parameter.name),
        `${inferExampleScalar(parameter.name)}-2`,
      ];
    default:
      return inferExampleScalar(parameter.name);
  }
}

function inferExampleScalar(name: string): string {
  switch (name) {
    case "componentPath":
      return "src/components/Button";
    case "name":
      return "@canonical/example-package";
    case "description":
      return "Example package";
    case "type":
      return "tool-ts";
    default:
      return `<${convertCamelToKebab(name)}>`;
  }
}

function findSubcommand(parent: Command, name: string): Command | undefined {
  return parent.commands.find((c) => c.name() === name);
}

function formatPositionalParam(param: ParameterDefinition): string {
  const isVariadic = param.type === "multiselect";
  const suffix = isVariadic ? "..." : "";

  return param.required
    ? `<${param.name}${suffix}>`
    : `[${param.name}${suffix}]`;
}

function findRootProgram(cmd: Command): Command {
  let current = cmd;
  while (current.parent) {
    current = current.parent;
  }
  return current;
}

/**
 * Write a string to a writable stream in chunks to work around a Bun
 * runtime segfault that occurs when writing large strings to stdout in
 * a single call.
 */
const CHUNK_SIZE = 4096;

function writeChunked(stream: NodeJS.WritableStream, text: string): void {
  if (text.length <= CHUNK_SIZE) {
    stream.write(text);
    return;
  }

  for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
    stream.write(text.slice(offset, offset + CHUNK_SIZE));
  }
}
