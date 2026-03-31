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
    if (param) {
      const isLastPositional = i === positionals.length - 1;
      if (param.type === "multiselect" && isLastPositional) {
        result[param.name] = args.slice(i);
        break;
      }
      result[param.name] = args[i];
    }
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
): void {
  program.enablePositionalOptions();
  const groups = new Map<string, CommandDefinition[]>();

  for (const cmd of commands) {
    if (cmd.path.length === 0) continue;
    const noun = cmd.path[0];
    if (!noun) continue;
    const existing = groups.get(noun) ?? [];
    existing.push(cmd);
    groups.set(noun, existing);
  }

  for (const [noun, cmds] of groups) {
    const singleSegment = cmds.filter((c) => c.path.length === 1);
    const multiSegment = cmds.filter((c) => c.path.length > 1);

    for (const cmd of singleSegment) {
      attachCommand(program, cmd, ctx);
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
        attachCommand(parent, { ...cmd, path: [verb] }, ctx, cmd);
      }
    }
  }
}

function attachCommand(
  parent: Command,
  cmd: CommandDefinition,
  ctx: CommandContext,
  originalCmd?: CommandDefinition,
): void {
  const name = cmd.path[cmd.path.length - 1];
  if (!name) return;

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
    handleResult(result, cmd);
  });
}

function handleResult(result: CommandResult, cmd?: CommandDefinition): void {
  switch (result.tag) {
    case "output": {
      const text = result.render.plain(result.value);
      if (text) {
        writeChunked(process.stdout, `${text}\n`);
      }
      break;
    }
    case "interactive": {
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
  const missing = findMissingInteractiveParameters(spec, cmd);
  const lines = ["Interactive mode not available in this binary."];

  if (missing.length === 0) {
    lines.push("Provide all required flags.");
    return lines.join(" ");
  }

  lines.push("Missing required flags:");
  lines.push(
    ...missing.map((parameter) => `  ${formatParameterUsage(parameter)}`),
  );

  const example = cmd ? buildInteractiveExample(spec, cmd, missing) : null;
  if (example) {
    lines.push("Example:");
    lines.push(`  ${example}`);
  }

  return lines.join("\n");
}

function findMissingInteractiveParameters(
  spec: InteractiveSpec,
  cmd?: CommandDefinition,
): ParameterDefinition[] {
  if (!cmd) {
    return [];
  }

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

function writeChunked(
  stream: NodeJS.WritableStream,
  text: string,
): void {
  if (text.length <= CHUNK_SIZE) {
    stream.write(text);
    return;
  }

  for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
    stream.write(text.slice(offset, offset + CHUNK_SIZE));
  }
}
