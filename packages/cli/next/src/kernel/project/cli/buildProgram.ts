/**
 * Build the Commander program from the grammar.
 *
 * Reads only the declarative fields of each {@link VerbSpec} — path, params,
 * summary, capability — never a run body, so constructing the tree stays on the
 * fast path and imports no verb implementations (the actions dynamic-dispatch
 * lazily). Verbs are grouped by noun: a self-verb (`["info"]`) attaches to the
 * root, sub-verbs (`["config","show"]`) hang under a noun parent. Positionals
 * become usage tokens, other params become kebab flags, and a mutating verb
 * gains the auto-injected `--dry-run` / `--undo` / `--yes` flags. Ported from
 * the v1 cli-core `registerAll`, retargeted at the grammar.
 */

import { Command, Option } from "commander";
import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "../../../constants.js";
import type { GlobalFlags } from "../../runtime/types.js";
import { kebabCase } from "../../spec/emitSurface.js";
import type { ParamSpec, VerbSpec } from "../../spec/types.js";
import { dispatch } from "./dispatch.js";
import { formatRootHelp } from "./rootHelp.js";
import { formatNounHelp, formatVerbHelp } from "./verbHelp.js";

/** Options controlling the built program. */
export interface BuildProgramOptions {
  /** Global flags for this invocation, closed over by every verb action. */
  readonly globalFlags: GlobalFlags;
  /** Binary name (defaults to `pragma2`). */
  readonly programName?: string;
  /** Program description shown in root help. */
  readonly description?: string;
  /** Version string for `--version`. */
  readonly version?: string;
}

/** The positional usage token for a param (`<name>` / `[name]`, variadic `...`). */
function positionalToken(param: ParamSpec): string {
  const variadic = param.kind === "string[]" ? "..." : "";
  return param.required
    ? `<${param.name}${variadic}>`
    : `[${param.name}${variadic}]`;
}

/** The Commander flag spec for a non-positional param. */
function flagSpec(param: ParamSpec): string {
  const flag = `--${kebabCase(param.name)}`;
  if (param.kind === "boolean") return flag;
  if (param.kind === "string[]") return `${flag} <values...>`;
  return `${flag} <value>`;
}

/** Install designed help for a command, suppressing Commander's auto-help. */
function useDesignedHelp(command: Command, text: () => string): void {
  command.configureHelp({ formatHelp: () => "" });
  command.addHelpText("beforeAll", (ctx) =>
    ctx.command === command ? `${text()}\n` : "",
  );
}

/** Register a verb's flags (plus mutation flags) onto its Commander command. */
function registerParams(command: Command, verb: VerbSpec): void {
  for (const param of verb.params) {
    if (param.positional) continue;
    const spec = flagSpec(param);
    if (param.kind === "enum") {
      const option = new Option(spec, param.doc).choices([...param.values]);
      if (param.default !== undefined) option.default(param.default);
      command.addOption(option);
    } else if ("default" in param && param.default !== undefined) {
      command.option(spec, param.doc, param.default as string | boolean);
    } else {
      command.option(spec, param.doc);
    }
  }

  if (verb.capability.mutates) {
    command.option("--dry-run", "Preview effects without applying them");
    command.option("--undo", "Reverse a previous run of this command");
    command.option("--yes", "Apply without an interactive confirmation");
  }
}

/** Split Commander's variadic action args into positionals and options. */
function splitActionArgs(actionArgs: readonly unknown[]): {
  positionals: string[];
  opts: Record<string, unknown>;
} {
  const positionals: string[] = [];
  let opts: Record<string, unknown> = {};
  for (const arg of actionArgs) {
    if (typeof arg === "string") {
      positionals.push(arg);
    } else if (Array.isArray(arg)) {
      positionals.push(
        ...arg.filter((value): value is string => typeof value === "string"),
      );
    } else if (arg instanceof Command) {
      // The trailing Command instance — skip.
    } else if (typeof arg === "object" && arg !== null) {
      opts = arg as Record<string, unknown>;
    }
  }
  return { positionals, opts };
}

/** Attach one verb as a leaf command under `parent`. */
function attachVerb(
  parent: Command,
  verb: VerbSpec,
  name: string,
  programName: string,
  globalFlags: GlobalFlags,
): void {
  const positionals = verb.params.filter((p) => p.positional);
  const suffix = positionals.map(positionalToken).join(" ");
  const fullName = suffix ? `${name} ${suffix}` : name;

  const command = parent.command(fullName).description(verb.summary);
  command.enablePositionalOptions();
  useDesignedHelp(command, () => formatVerbHelp(programName, verb));
  registerParams(command, verb);

  command.action(async (...actionArgs: unknown[]) => {
    const { positionals: positionalArgs, opts } = splitActionArgs(actionArgs);
    await dispatch(verb, positionalArgs, opts, globalFlags);
  });
}

/**
 * Build the Commander program for a set of verbs.
 *
 * @param verbs - The verbs to project (hidden verbs are excluded).
 * @param options - Global flags and program metadata.
 * @returns The configured program, ready for `parseAsync`.
 */
export function buildProgram(
  verbs: readonly VerbSpec[],
  options: BuildProgramOptions,
): Command {
  const programName = options.programName ?? BIN_NAME;
  const description = options.description ?? PROGRAM_DESCRIPTION;
  const version = options.version ?? VERSION;
  const live = verbs.filter((verb) => !verb.hidden);

  const program = new Command();
  program.name(programName).description(description);
  program.version(version, "-v, --version");
  program.enablePositionalOptions();
  program.exitOverride();
  useDesignedHelp(program, () =>
    formatRootHelp(programName, description, live),
  );

  const groups = new Map<string, VerbSpec[]>();
  for (const verb of live) {
    const noun = verb.path[0];
    const bucket = groups.get(noun) ?? [];
    bucket.push(verb);
    groups.set(noun, bucket);
  }

  for (const [noun, bucket] of groups) {
    for (const verb of bucket.filter((v) => v.path.length === 1)) {
      attachVerb(program, verb, noun, programName, options.globalFlags);
    }

    const subVerbs = bucket.filter((v) => v.path.length > 1);
    if (subVerbs.length > 0) {
      const parent = program.command(noun).description(`${noun} commands`);
      parent.enablePositionalOptions();
      useDesignedHelp(parent, () => formatNounHelp(programName, noun, live));
      for (const verb of subVerbs) {
        attachVerb(
          parent,
          verb,
          verb.path[1] as string,
          programName,
          options.globalFlags,
        );
      }
    }
  }

  return program;
}
