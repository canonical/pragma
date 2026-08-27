/**
 * The `create` CLI mount: the summon generator TREE, mounted under the
 * `create` noun through the SAME registration path the summon bin uses
 * (`registerGeneratorCommands` from
 * `@canonical/summon-core/projection/commander`), fed
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
 * This is the HEAVY half of the create projection, reached ONLY through the
 * dynamic import in `cliProjection.ts` — the light half the capabilities
 * barrel carries. The split exists for the fast paths: `--help` and
 * `__complete` import the barrel on every spawn and register nothing, so the
 * registration machinery this module needs (summon-core's projection helpers
 * and Commander adapter, Commander itself, the kernel dispatcher) must load
 * only when an invocation actually enters the `create` subtree. The
 * lazy-graph guard in `lazy.test.ts` pins that boundary.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import {
  type CommandEntry,
  decideInteraction,
  explicitAnswersComplete,
  extractAnswers,
  type HostFlags,
  type InteractionMode,
  missingExplicitFlags,
  type ProjectedPrompt,
  refusalMessage,
} from "@canonical/summon-core/projection";
import {
  type CommanderHost,
  emitToProcess,
  registerGeneratorCommands,
} from "@canonical/summon-core/projection/commander";
import type { Task } from "@canonical/task";
import { type Command, CommanderError } from "commander";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { renderErrorForFormat } from "../../kernel/error/renderError.js";
import { MUTATION_FLAG_DOCS } from "../../kernel/project/cli/constants.js";
import {
  cliIsTTY,
  dispatchPrepared,
  type MutationFlags,
} from "../../kernel/project/cli/dispatch.js";
import {
  helpColumns,
  helpDim,
  helpHeading,
  helpUsage,
} from "../../kernel/project/cli/helpFormat.js";
import type { CliMountHost, VerbSpec } from "../../kernel/spec/types.js";
import { CREATE_GENERATORS } from "./constants.js";
import { createFormatters } from "./create.render.js";
import { CREATE_CAPABILITY, runCreate } from "./create.verb.js";
import { renderCreateHelp } from "./createHelp.js";
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
  // The kernel's own mutation-flag rows (one authoring point with
  // registration and verb help), then its `--help` row (rootHelp.ts), not
  // Commander's phrasing — one voice across every help page, and `--help`
  // is the only spelling (the subtree inherits the root's long-only help
  // option).
  ...MUTATION_FLAG_DOCS.map(({ flag, doc }) => ({
    flags: flag,
    description: doc,
  })),
  { flags: "--help", description: "Show help (works on any command)" },
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

/**
 * Mount the generator tree onto the `create` parent command.
 *
 * The registration entry `cliProjection.ts` dynamically imports — see this
 * module's header for why it must not be reached statically.
 */
export function mountCreateTree(parent: Command, host: CliMountHost): void {
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

  const cliHost: CommanderHost<SurfaceEntry> = {
    registerFlags: (cmd) => {
      // Reset the designed-help suppression a Commander child inherits from
      // the root program; grouped help re-configures the leaves right after.
      cmd.configureHelp({});
      for (const { flag, doc } of MUTATION_FLAG_DOCS) {
        cmd.option(flag, doc);
      }
    },
    helpFlags: MOUNT_FLAG_HELP,
    // The seam's presentation half: the projection's structure, pragma's
    // house style (see createHelp.ts).
    renderHelp: renderCreateHelp,
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
    // The projection's usage errors reframe ONLY under an explicitly
    // requested machine format — the kernel's ONE gate+renderer decision
    // (`renderErrorForFormat`, shared with `writeRefusal` and bin.ts's
    // usage-error sites), autoLlm excluded by its construction, so the
    // default piped bytes stay the cross-CLI parity surface. Codes mirror
    // bin.ts's classification: unknown command → UNKNOWN_VERB, every other
    // usage error → INVALID_INPUT. The match is serialized PER KIND: an
    // unknown SEGMENT is a fuzzy match, so its bare candidate rides in
    // `suggestions` (substitutable for the token the headline names); an
    // excess positional's match is NOT substitutable — it may BE the stray
    // — so that kind instead carries the correction in the covenant's
    // `recovery.cli` (`[...chain, suggestion].join(" ")`), and ONLY when
    // that command is a DECLARED RUNNABLE LEAF: `chain` is `[<bin>,
    // "create", ...segments]`, so everything past the mount point joined
    // with the suggestion is the CREATE_SURFACE key, and a namespace match
    // (exit-1 help page, can never scaffold) ships NO recovery.
    emit: (outcome) => {
      if (outcome.kind === "namespace-help") return emitToProcess(outcome);
      const { error } = outcome;
      const rendered = renderErrorForFormat(
        new PragmaError({
          code:
            error.kind === "unknown-segment" ? "UNKNOWN_VERB" : "INVALID_INPUT",
          message: error.headline,
          ...(error.kind === "unknown-segment" && error.suggestion !== undefined
            ? { suggestions: [error.suggestion] }
            : {}),
          ...(error.kind === "excess-positional" &&
          error.suggestion !== undefined &&
          CREATE_SURFACE[
            [...error.chain.slice(2), error.suggestion].join("/")
          ] !== undefined
            ? {
                recovery: {
                  message: "Run the corrected invocation.",
                  cli: [...error.chain, error.suggestion].join(" "),
                },
              }
            : {}),
        }),
        host.globalFlags.format,
      );
      // No machine format requested: the default piped bytes are the parity
      // surface.
      if (rendered === undefined) return emitToProcess(outcome);
      process.stderr.write(`${rendered}\n`);
      process.exitCode = outcome.exitCode;
    },
  };

  registerGeneratorCommands(parent, surfaceBarrel(), cliHost);
}

/**
 * The pragma-styled topic tree (paths + descriptions from the manifest):
 * one row per INVOCABLE command path (`component react`, `package`, …), so
 * every row is copy-pasteable after `pragma create ` — the same kernel
 * primitives, and the same shape, as every other noun's verb listing
 * (`formatNounHelp`).
 */
export function topicTree(programName: string): string {
  const rows = Object.values(CREATE_GENERATORS).flatMap((binding) =>
    binding.paths.map(
      (commandPath) =>
        [
          commandPath.split("/").join(" "),
          CREATE_SURFACE[commandPath]?.description ?? "",
        ] as const,
    ),
  );
  return [
    helpUsage(`${programName} create <path...> [options]`),
    "",
    "Scaffold from the summon generator tree.",
    "",
    helpHeading("Generators"),
    ...helpColumns(rows),
    "",
    helpDim(
      `Run \`${programName} create <path...> --help\` for a generator's flags.`,
    ),
    helpDim(
      `The tree mirrors the summon CLI: \`${programName} create <path...>\` ≡ \`summon <path...>\`.`,
    ),
  ].join("\n");
}
