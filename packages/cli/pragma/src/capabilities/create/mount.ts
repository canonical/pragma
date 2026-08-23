/**
 * The `create` CLI mount: the summon generator TREE, mounted under the
 * `create` noun through the SAME registration path the summon bin uses
 * (`registerGeneratorCommands` from `@canonical/summon-core/projection`), fed
 * by the build-time projection (`createSurface.generated.ts`) — so `pragma
 * create component react [component-path]` and `summon component react
 * [component-path]` are one grammar, derived once.
 *
 * The mount owns everything beneath the noun: tree segments as subcommands,
 * prompt-derived flags (a default-true confirm registers only its `--no-`
 * form), grouped help, the excess-positional guard, and the leaf action —
 * which extracts the EXPLICIT answers, makes the ONE interaction decision
 * (refusing before the create runtime ever loads), and hands the kernel's
 * `dispatchPrepared` a synthesized per-leaf VerbSpec so dry-run/undo/real-run
 * rendering, exit codes, SIGINT and the SEC-2 jail reuse the existing
 * machinery byte-for-byte.
 *
 * Fast-path discipline: this module imports only the projection (UI-free,
 * graph-guarded), the generated surface data, and kernel spec/dispatch
 * modules — never summon-core's barrel or a generator.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import {
  buildOptionInfo,
  type CommandEntry,
  decideInteraction,
  explicitAnswersComplete,
  extractAnswers,
  type GeneratorCliHost,
  type HostFlags,
  type InteractionMode,
  missingExplicitFlags,
  type ProjectedPrompt,
  refusalMessage,
  registerGeneratorCommands,
  toKebabCase,
} from "@canonical/summon-core/projection";
import type { Task } from "@canonical/task";
import { type Command, CommanderError } from "commander";
import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { renderErrorForFormat } from "../../kernel/error/renderError.js";
import {
  cliIsTTY,
  dispatchPrepared,
  type MutationFlags,
} from "../../kernel/project/cli/dispatch.js";
import type {
  CliMountHost,
  CliProjection,
  CompletionChildFlag,
  CompletionChildSpec,
  ReferenceCliSyntax,
  VerbSpec,
} from "../../kernel/spec/types.js";
import { CREATE_GENERATORS } from "./constants.js";
import { createFormatters } from "./create.render.js";
import { CREATE_CAPABILITY, runCreate } from "./create.verb.js";
import { CREATE_SURFACE } from "./createSurface.generated.js";
import type { CreateKind } from "./types.js";

/** A projected runnable entry: the surface data plus its command path. */
interface SurfaceEntry {
  readonly commandPath: string;
  readonly meta: { readonly description: string };
  readonly prompts: readonly ProjectedPrompt[];
}

/** The mount's standard-flag rows for the grouped-help Global Options block. */
const MOUNT_FLAG_HELP: HostFlags = [
  { flags: "--dry-run", description: "Preview effects without applying them" },
  { flags: "--undo", description: "Reverse a previous run of this command" },
  { flags: "--yes", description: "Apply without an interactive confirmation" },
  { flags: "-h, --help", description: "display help for command" },
];

/** The declared tree, flattened to registration entries (parents first). */
function surfaceBarrel(): CommandEntry<SurfaceEntry>[] {
  const entries: CommandEntry<SurfaceEntry>[] = [];
  const namespaces = new Set<string>();
  for (const binding of Object.values(CREATE_GENERATORS)) {
    for (const commandPath of binding.paths) {
      const segments = commandPath.split("/");
      if (segments.length > 1) namespaces.add(segments[0] as string);
    }
  }
  for (const namespace of namespaces) {
    entries.push({ path: [namespace], description: `${namespace} generators` });
  }
  for (const binding of Object.values(CREATE_GENERATORS)) {
    for (const commandPath of binding.paths) {
      const surface = CREATE_SURFACE[commandPath];
      if (!surface) {
        throw new Error(
          `createSurface.generated.ts carries no entry for "${commandPath}" — rerun the build`,
        );
      }
      entries.push({
        path: commandPath.split("/"),
        generator: {
          commandPath,
          meta: { description: surface.description },
          prompts: surface.prompts,
        },
      });
    }
  }
  return entries.sort((a, b) => a.path.length - b.path.length);
}

/** The create noun that declares a command path. */
function kindOf(commandPath: string): CreateKind {
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    if ((binding.paths as readonly string[]).includes(commandPath)) {
      return kind as CreateKind;
    }
  }
  throw new Error(`undeclared command path ${commandPath}`);
}

/**
 * Synthesize the per-leaf VerbSpec `dispatchPrepared` runs: params are EMPTY
 * (the mount already extracted the explicit answers — leaf commands carry no
 * Commander defaults, so explicit stays distinguishable from default), and
 * `run` is `runCreate` over the full command path.
 */
export function leafVerb(commandPath: string): VerbSpec {
  const surface = CREATE_SURFACE[commandPath];
  return {
    path: ["create", kindOf(commandPath)],
    summary: surface?.description ?? commandPath,
    params: [],
    output: { formatters: createFormatters },
    capability: CREATE_CAPABILITY,
    run: (params, rt) =>
      runCreate(commandPath, params, rt) as unknown as Task<GeneratorResult>,
  } as VerbSpec;
}

/**
 * The explicit answers of one leaf invocation: flag-extracted (explicit-only,
 * confirm equality-vs-default) plus the positional when given. Exported for
 * the grammar tests — this is the exact bag the wizard is seeded with.
 */
export function explicitLeafAnswers(
  prompts: readonly ProjectedPrompt[],
  positionalValue: string | undefined,
  options: Record<string, unknown>,
): Record<string, unknown> {
  const explicit = extractAnswers(options, prompts);
  const positionalPrompt = prompts.find((prompt) => prompt.positional);
  if (positionalPrompt && positionalValue !== undefined) {
    explicit[positionalPrompt.name] = positionalValue;
  }
  return explicit;
}

/**
 * The mount's mode resolution — `decideInteraction` over the leaf's five
 * inputs, with the TTY fact INJECTED so the resolution is testable with
 * `tty: true` (no suite can drive a real TTY through a subprocess). The
 * action calls it with {@link cliIsTTY} — the same exported H3 gate the
 * kernel's interaction context reads — so the mount and `runCreate` can
 * never disagree about interactivity.
 */
export function resolveCreateMode(
  prompts: readonly ProjectedPrompt[],
  explicit: Record<string, unknown>,
  mutation: MutationFlags,
  tty: boolean,
): InteractionMode {
  return decideInteraction({
    dryRun: mutation.dryRun,
    undo: mutation.undo,
    yes: mutation.yes,
    isTTY: tty,
    explicitComplete: explicitAnswersComplete(prompts, explicit),
  }).mode;
}

/**
 * Write the refusal and set exit 2. The refusal is the cross-CLI parity
 * surface (contract §3): its default bytes are the shared message verbatim,
 * no envelope prefix — the summon bin's full stderr, byte for byte — and
 * ONLY an explicitly requested machine format reframes it, through the
 * kernel's ONE gate+renderer decision (`renderErrorForFormat`): `--format
 * json` emits the D3 `{ ok:false, error }` envelope, `--format llm` the
 * condensed Markdown error form, both as `INVALID_INPUT` through the same
 * renderers every other pragma error uses. Implicit auto-LLM detection (a
 * piped run without `--format`) is excluded by the helper's construction —
 * an inferred output mode must never break refusal byte-parity with summon.
 */
function writeRefusal(
  message: string,
  flags: import("../../kernel/runtime/types.js").GlobalFlags,
): void {
  const rendered = renderErrorForFormat(
    new PragmaError({ code: "INVALID_INPUT", message }),
    flags.format,
  );
  process.stderr.write(`${rendered ?? message}\n`);
  process.exitCode = 2;
}

/** Build the mount (the module-level CLI projection hook). */
export function createCliProjection(): CliProjection {
  return {
    mount,
    completionChildren,
    referenceIntro: REFERENCE_INTRO,
    referenceSyntax,
  };
}

/** The leaves' prompts, unioned by first-seen name (the binding param order). */
function unionPrompts(paths: readonly string[]): ProjectedPrompt[] {
  const seen = new Set<string>();
  const union: ProjectedPrompt[] = [];
  for (const commandPath of paths) {
    for (const prompt of CREATE_SURFACE[commandPath]?.prompts ?? []) {
      if (seen.has(prompt.name)) continue;
      seen.add(prompt.name);
      union.push(prompt);
    }
  }
  return union;
}

/**
 * The REGISTERED reference syntax for one binding verb (the mounted spelling
 * the generated reference prints): the usage line carries the real tree
 * segment (`create application react …`, `<framework>` for the multi-leaf
 * binding — its values live in the Args table) and the registered kebab
 * positional, which is also handed over as the per-param positional token so
 * the Arguments table prints the SAME spelling; each flag token is the one
 * the mount actually registers (a default-true confirm registers ONLY its
 * `--no-` form), derived from the same `buildOptionInfo` the mount and
 * completion use. Reached only through {@link createCliProjection} — the
 * kernel's reference emitter is its one consumer; the reference pins read
 * the committed pages it produced.
 */
function referenceSyntax(
  verbPath: VerbSpec["path"],
): ReferenceCliSyntax | undefined {
  const kind = verbPath[1] as CreateKind | undefined;
  const binding = kind ? CREATE_GENERATORS[kind] : undefined;
  if (verbPath[0] !== "create" || !binding) return undefined;
  const paths = binding.paths as readonly string[];
  const first = paths[0] as string;

  const tokens: string[] = ["create", kind as string];
  if (paths.length > 1) tokens.push("<framework>");
  else if (first.includes("/")) tokens.push(first.split("/")[1] as string);
  const prompts = unionPrompts(paths);
  const positional = prompts.find((prompt) => prompt.positional === true);
  const positionalTokens: Record<string, string> = {};
  if (positional) {
    const token = `[${toKebabCase(positional.name)}]`;
    tokens.push(token);
    positionalTokens[positional.name] = token;
  }
  tokens.push("[options]");

  const flagTokens: Record<string, string> = {};
  for (const prompt of prompts) {
    if (prompt.positional === true) continue;
    flagTokens[prompt.name] = promptFlag(prompt).flag;
  }
  return { usage: tokens.join(" "), flagTokens, positionalTokens };
}

/** Mount the generator tree onto the `create` parent command. */
function mount(parent: Command, host: CliMountHost): void {
  // The parent's own face: the topic tree (paths + descriptions), on bare
  // `create` AND on `create --help` alike, exit 0.
  parent.configureHelp({ formatHelp: () => "" });
  parent.addHelpText("beforeAll", (ctx) =>
    ctx.command === parent ? `${topicTree(host.programName)}\n` : "",
  );
  parent.allowExcessArguments(true);
  parent.action(async () => {
    const stray = parent.args[0];
    if (stray !== undefined) {
      // An unrecognized topic keeps the bin's "Did you mean?" flow (the bin
      // re-derives the token from argv; this message is cosmetic).
      throw new CommanderError(
        2,
        "commander.unknownCommand",
        `error: unknown command '${stray}'`,
      );
    }
    process.stdout.write(`${topicTree(host.programName)}\n`);
  });

  const cliHost: GeneratorCliHost<SurfaceEntry> = {
    standardFlags: {
      register: (cmd) => {
        // Reset the designed-help suppression a Commander child inherits from
        // the root program; grouped help re-configures the leaves right after.
        cmd.configureHelp({});
        cmd
          .option("--dry-run", "Preview effects without applying them")
          .option("--undo", "Reverse a previous run of this command")
          .option("--yes", "Apply without an interactive confirmation");
      },
      help: MOUNT_FLAG_HELP,
    },
    action: async (entry, positionalValue, options) => {
      const generator = entry.generator as SurfaceEntry;
      const explicit = explicitLeafAnswers(
        generator.prompts,
        positionalValue,
        options,
      );
      const mutation = {
        dryRun: options.dryRun === true,
        undo: options.undo === true,
        yes: options.yes === true,
      };
      // The ONE interaction decision — made BEFORE the create runtime loads,
      // so a refusal never touches summon-core. (`runCreate` re-derives the
      // same mode from the same inputs to pick its prompt strategy.)
      const mode = resolveCreateMode(
        generator.prompts,
        explicit,
        mutation,
        cliIsTTY(),
      );
      if (mode === "refuse") {
        writeRefusal(
          refusalMessage(missingExplicitFlags(generator.prompts, explicit)),
          host.globalFlags,
        );
        return;
      }
      await dispatchPrepared(
        leafVerb(generator.commandPath),
        explicit,
        mutation,
        host.globalFlags,
      );
    },
    onNamespace: (cmd) => {
      // Reset the designed-help suppression a Commander child inherits from
      // the root program. The namespace BEHAVIOR (the shared did-you-mean on
      // a stray segment, help-on-stderr exit 1 when bare) is the
      // projection's, not the mount's — both hosts emit the same lines.
      cmd.configureHelp({});
    },
    // The projection's two usage errors (unknown segment, excess positional)
    // reframe ONLY under an explicitly requested machine format — the
    // kernel's ONE gate+renderer decision (`renderErrorForFormat`, shared
    // with `writeRefusal` and bin.ts's usage-error sites), autoLlm excluded
    // by its construction, so the default piped bytes stay the cross-CLI
    // parity surface. Codes mirror bin.ts's classification of Commander
    // parse failures: unknown command → UNKNOWN_VERB, every other usage
    // error → INVALID_INPUT. The envelope `message` is SINGLE-LINE (the
    // prefix-stripped first line of the projection's rendering) and
    // `suggestions` carries the BARE candidate segment (`detail.suggestion`)
    // — the field's one convention (see ErrorPayload.suggestions), matching
    // bin.ts's own UNKNOWN_VERB tier. The corrected FULL invocation
    // (`[...detail.chain, suggestion]`) lives only in the default prose
    // did-you-mean line, which the machine formats drop.
    writeUsageError: (message, kind, detail) => {
      const suggested = detail?.suggestion;
      const error = new PragmaError({
        code: kind === "unknown-segment" ? "UNKNOWN_VERB" : "INVALID_INPUT",
        message: (message.split("\n")[0] as string).replace(/^error:\s*/i, ""),
        ...(suggested === undefined ? {} : { suggestions: [suggested] }),
      });
      const rendered = renderErrorForFormat(error, host.globalFlags.format);
      if (rendered === undefined) return false;
      process.stderr.write(`${rendered}\n`);
      return true;
    },
  };

  registerGeneratorCommands(parent, surfaceBarrel(), cliHost);
}

/** The pragma-styled topic tree (paths + descriptions from the manifest). */
export function topicTree(programName: string): string {
  const lines: string[] = [
    "Scaffold from the summon generator tree.",
    "",
    `Usage: ${programName} create <path...> [options]`,
    "",
    "Available generators:",
  ];
  const printed = new Set<string>();
  for (const binding of Object.values(CREATE_GENERATORS)) {
    for (const commandPath of binding.paths) {
      const segments = commandPath.split("/");
      const surface = CREATE_SURFACE[commandPath];
      if (segments.length === 1) {
        lines.push(
          `  ${(segments[0] as string).padEnd(20)}${surface?.description ?? ""}`,
        );
        continue;
      }
      const namespace = segments[0] as string;
      if (!printed.has(namespace)) {
        printed.add(namespace);
        lines.push(`  ${namespace}`);
      }
      lines.push(
        `    ${(segments[1] as string).padEnd(18)}${surface?.description ?? ""}`,
      );
    }
  }
  lines.push(
    "",
    `Run \`${programName} create <path...> --help\` for a generator's flags.`,
    `The tree mirrors the summon CLI: \`${programName} create <path...>\` ≡ \`summon <path...>\`.`,
  );
  return lines.join("\n");
}

/** One leaf's completion node, derived from its projected prompts. */
function leafChild(label: string, commandPath: string): CompletionChildSpec {
  const surface = CREATE_SURFACE[commandPath];
  const prompts = surface?.prompts ?? [];
  return {
    label,
    flags: prompts
      .filter((prompt) => prompt.positional !== true)
      .map(promptFlag),
    positionals: prompts
      .filter((prompt) => prompt.positional === true)
      .map((prompt) => ({
        name: prompt.name,
        required: false,
        files: /(path|dir)$/i.test(prompt.name),
      })),
  };
}

/** A prompt's completion flag: the REGISTERED token (`--no-` for default-true). */
function promptFlag(prompt: ProjectedPrompt): CompletionChildFlag {
  const info = buildOptionInfo(prompt);
  const token = info.flags.split(" ")[0] as string;
  return {
    flag: token,
    takesValue: info.flags.includes("<"),
    ...(prompt.type === "select" && prompt.choices && prompt.choices.length > 0
      ? { values: prompt.choices.map((choice) => choice.value) }
      : {}),
  };
}

/** Dedupe flags by token, first-seen order (the namespace union). */
function unionFlags(
  children: readonly CompletionChildSpec[],
): CompletionChildFlag[] {
  const seen = new Set<string>();
  const union: CompletionChildFlag[] = [];
  for (const child of children) {
    for (const flag of child.flags) {
      if (seen.has(flag.flag)) continue;
      seen.add(flag.flag);
      union.push(flag);
    }
  }
  return union;
}

/**
 * The completion surface per verb label: leaves carry their prompt-derived
 * flags in their REGISTERED spelling; a namespace node offers its segment
 * values at position 0, the shared leaf positional after it, the union of
 * leaf flags, and the leaf children for the dynamic tier's precise walk.
 */
function completionChildren(): Readonly<Record<string, CompletionChildSpec>> {
  const record: Record<string, CompletionChildSpec> = {};
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    const paths = binding.paths as readonly string[];
    const first = paths[0] as string;
    if (paths.length === 1 && !first.includes("/")) {
      record[kind] = leafChild(kind, first);
      continue;
    }
    const children = paths.map((commandPath) =>
      leafChild(commandPath.split("/")[1] as string, commandPath),
    );
    // The shared tail: every declared leaf carries the same positional shape.
    const tail = children[0]?.positionals ?? [];
    record[kind] = {
      label: kind,
      flags: unionFlags(children),
      positionals: [
        {
          name: "framework",
          required: true,
          values: children.map((child) => child.label),
        },
        ...tail,
      ],
      children,
    };
  }
  return record;
}

/** The generated-reference intro under the `create` heading (the pointer). */
const REFERENCE_INTRO =
  "The `create` surface is a PROJECTION of the summon generator tree: " +
  `\`${BIN_NAME} create <path...>\` ≡ \`summon <path...>\` over the declared bindings — ` +
  "same grammar, same flags, same wizard, byte-identical trees. Tree segments are " +
  "subcommands (`create component react|svelte|lit`, `create application react`), and " +
  "every flag derives from the generators' own prompts (a default-on confirm registers " +
  "only its `--no-` form). The normative contract lives at " +
  "[packages/summon/core/docs/parity-contract.md](../../../../summon/core/docs/parity-contract.md).";
