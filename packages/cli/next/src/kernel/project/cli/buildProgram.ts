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
  /** Binary name (defaults to `pragma`). */
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
 * Attach a noun that has sub-verbs, creating its parent command exactly once.
 *
 * When the noun also has a SELF-verb (`["setup"]`), the parent command doubles
 * as that verb — it carries the self-verb's own params/mutation flags and
 * `.action()` AND hosts the sub-commands, so `pragma setup` runs the self-verb
 * while `pragma setup mcp` routes to the sub. Commander resolves a registered
 * sub-command name before the parent's action, so the two never collide — but
 * only because the one covenant noun shaped this way (`setup`) has NO positional
 * on its self-verb, so `<noun> <sub>` can never be read as a positional value.
 * A noun with only sub-verbs keeps a plain, action-less group parent.
 *
 * @param program - The root program.
 * @param noun - The noun to attach.
 * @param selfVerb - The self-verb (`path.length === 1`), if the noun has one.
 * @param subVerbs - The noun's sub-verbs (`path.length > 1`).
 * @param programName - The binary name shown in help.
 * @param globalFlags - Global flags closed over by every action.
 * @param live - All non-hidden verbs, for noun-level help.
 */
function attachNounGroup(
  program: Command,
  noun: string,
  selfVerb: VerbSpec | undefined,
  subVerbs: readonly VerbSpec[],
  programName: string,
  globalFlags: GlobalFlags,
  live: readonly VerbSpec[],
): void {
  const parent = program.command(noun);
  parent.enablePositionalOptions();
  useDesignedHelp(parent, () => formatNounHelp(programName, noun, live));

  if (selfVerb) {
    // A mixed noun (self-verb + sub-verbs) MUST have no positional on its
    // self-verb: Commander resolves a registered sub-command name before the
    // parent action, so a positional would be shadowed by `<noun> <sub>` and
    // silently dropped from the parent's model. Enforce the invariant the
    // JSDoc above documents, turning a latent footgun into a build-time error.
    const positional = selfVerb.params.find((param) => param.positional);
    if (positional) {
      throw new Error(
        `buildProgram: mixed noun "${noun}" self-verb declares positional ` +
          `"${positional.name}"; a mixed noun's self-verb must have no ` +
          "positional (it collides with sub-verb routing).",
      );
    }
    parent.description(selfVerb.summary);
    registerParams(parent, selfVerb);
    parent.action(async (...actionArgs: unknown[]) => {
      const { positionals: positionalArgs, opts } = splitActionArgs(actionArgs);
      await dispatch(selfVerb, positionalArgs, opts, globalFlags);
    });
  } else {
    parent.description(`${noun} commands`);
    // A sub-verb-only noun invoked bare (`pragma block`) prints its own help
    // and exits 0 — byte-for-byte the `pragma block --help` page, because it
    // runs the SAME Commander help machinery `--help` runs (`outputHelp`),
    // minus the `helpDisplayed` throw, so it returns 0. Commander resolves a
    // registered sub-command name BEFORE the parent action (the invariant the
    // mixed-noun path above relies on), so `pragma block list` still routes to
    // the sub-verb; only the bare noun reaches this action.
    //
    // An UNRECOGNIZED sub-verb (`pragma block bogus`) must keep its "Did you
    // mean?" suggestion. Adding an action turns Commander's default
    // unknown-command error into a generic "too many arguments" (the action
    // declares no positional), so we opt into excess args and re-raise the
    // SAME `unknownCommand` error the bin's suggester already routes on — the
    // bin re-derives the offending token from argv, so its message is cosmetic.
    parent.allowExcessArguments(true);
    parent.action(async () => {
      // The unrecognized sub-verb lands in `parent.args` (excess operands), not
      // as a declared action parameter, since the parent declares none.
      const excess = parent.args[0];
      if (excess !== undefined) {
        const { CommanderError } = await import("commander");
        throw new CommanderError(
          2,
          "commander.unknownCommand",
          `error: unknown command '${excess}'`,
        );
      }
      parent.outputHelp();
    });
  }

  for (const verb of subVerbs) {
    attachVerb(parent, verb, verb.path[1] as string, programName, globalFlags);
  }
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
    const selfVerbs = bucket.filter((v) => v.path.length === 1);
    const subVerbs = bucket.filter((v) => v.path.length > 1);

    // Pure self-verb noun(s) — attach each leaf directly to the root, as before.
    if (subVerbs.length === 0) {
      for (const verb of selfVerbs) {
        attachVerb(program, verb, noun, programName, options.globalFlags);
      }
      continue;
    }

    // Has sub-verbs (and, for the mixed noun `setup`, also a self-verb): the
    // noun parent is created ONCE. A pre-fold buildProgram registered
    // `program.command(noun)` twice for such a noun (self leaf + sub parent) —
    // Commander then saw a duplicate `setup` command.
    attachNounGroup(
      program,
      noun,
      selfVerbs[0],
      subVerbs,
      programName,
      options.globalFlags,
      live,
    );
  }

  return program;
}
