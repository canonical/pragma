/**
 * The CLI dispatcher: from parsed argv to rendered output.
 *
 * Coerces raw string args into typed params by {@link ParamSpec.kind} (no zod
 * on this path), boots the runtime, runs the verb across the effect seam, and
 * renders. The seam is the discriminator `capability.mutates`: a read is a
 * plain `Promise` rendered directly; a mutation is a `Task` interpreted under
 * the node interpreter (`--yes`), the dry-run interpreter (`--dry-run`), or the
 * undo interpreter (`--undo`). `--format json` wraps output in the full
 * `{ ok, data, meta }` envelope (D3); errors render to stderr with a mapped
 * exit code.
 */

import { describeEffect, type Effect, type Task } from "@canonical/task";
import { runPreview, runTask, runUndo } from "@canonical/task/node";
import {
  asPragmaError,
  CANCELLED_MESSAGE,
  isCancellation,
  isInterruption,
} from "../../error/fromTaskError.js";
import { PragmaError } from "../../error/PragmaError.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "../../error/renderError.js";
import type { RenderContext } from "../../render/contracts.js";
import { successEnvelope } from "../../render/envelope.js";
import { writeStdout } from "../../render/writeStdout.js";
import { bootRuntime } from "../../runtime/boot.js";
import type {
  GlobalFlags,
  InteractionRuntime,
  PragmaRuntime,
} from "../../runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../spec/types.js";
import { EXIT, mapExitCode } from "./exitCodes.js";

/** The CLI-only mutation flags auto-injected onto every mutating verb. */
export interface MutationFlags {
  readonly dryRun: boolean;
  readonly undo: boolean;
  readonly yes: boolean;
}

/**
 * THE CLI interactivity gate (H3): stdin AND stderr are TTYs. The Ink wizard
 * renders to stderr and reads stdin, so `<verb> 2>/dev/null` must be
 * non-interactive — gating on stdout would mount an invisible render that
 * blocks on stdin. One exported fact: the kernel's interaction context and a
 * mounted subtree's own decision both read it here, so the two callers can
 * never disagree about what "a TTY" means.
 */
export function cliIsTTY(): boolean {
  return process.stdin.isTTY === true && process.stderr.isTTY === true;
}

/**
 * Route a Task's log effects to stderr. The interpreter otherwise falls back to
 * `console.log` (stdout), which would corrupt the `--format json` / MCP stdio
 * data stream; diagnostics belong on stderr.
 */
const logToStderr = (_level: string, message: string): void => {
  process.stderr.write(`${message}\n`);
};

/** A silenced log sink — `--quiet` drops progress; errors render elsewhere. */
const logNowhere = (_level: string, _message: string): void => {};

/**
 * The interpreter log sink for this invocation: stderr, or — under `--quiet`
 * — nothing. Progress/stage lines are success-path output; error rendering
 * never routes through this sink, so muting it cannot hide a failure.
 */
function logSink(flags: GlobalFlags): (level: string, message: string) => void {
  return flags.quiet === true ? logNowhere : logToStderr;
}

/** The result of running a verb: what to write where, and the exit code. */
export interface DispatchOutcome {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exitCode: number;
}

/** Coerce one raw arg into the type its {@link ParamSpec} declares. */
function coerceParam(param: ParamSpec, raw: unknown): unknown {
  // A repeatable flag's collector hands over an array of occurrences; coerce
  // each element so an enum still validates every value.
  if (
    Array.isArray(raw) &&
    (param.kind === "string" || param.kind === "enum") &&
    param.repeatable === true
  ) {
    return raw.map((value) => coerceParam(param, value));
  }
  switch (param.kind) {
    case "number": {
      const value = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(value)) {
        throw PragmaError.invalidInput(param.name, String(raw));
      }
      return value;
    }
    case "boolean":
      return typeof raw === "boolean" ? raw : raw === "true";
    case "enum": {
      const value = String(raw);
      if (!param.values.includes(value)) {
        throw PragmaError.invalidInput(param.name, value, {
          validOptions: [...param.values],
        });
      }
      return value;
    }
    default:
      return raw;
  }
}

/**
 * Build the typed param bag from Commander's positional args and options.
 *
 * Flag options arrive keyed by their camelCase param name (Commander derives
 * `withHistory` from `--with-history`); positionals map in declared order, with
 * a trailing `string[]` param absorbing the remainder.
 *
 * @param params - The verb's parameter specs.
 * @param positionals - Positional args in order.
 * @param opts - Commander's parsed option values.
 * @returns The coerced param bag passed to `run`.
 */
export function extractParams(
  params: readonly ParamSpec[],
  positionals: readonly string[],
  opts: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const param of params) {
    if (param.positional) continue;
    const raw = opts[param.name];
    if (raw !== undefined) {
      result[param.name] = coerceParam(param, raw);
    } else if ("default" in param && param.default !== undefined) {
      result[param.name] = param.default;
    }
  }

  const positional = params.filter((p) => p.positional);
  for (let i = 0; i < positional.length && i < positionals.length; i++) {
    const param = positional[i] as ParamSpec;
    if (param.kind === "string[]" && i === positional.length - 1) {
      result[param.name] = positionals.slice(i);
      break;
    }
    result[param.name] = coerceParam(param, positionals[i]);
  }

  return result;
}

/**
 * Render a read/execute result through the verb's formatters.
 *
 * The plain branch owns two ROUTING decisions (the rendering itself stays in
 * the formatters): it threads the presentation context (`--no-headers`,
 * stdout's TTY-ness) into the plain formatter, and it routes a declared
 * empty-state notice to STDERR with exit 0 — a zero-record result is a calm
 * success, and stdout (the data stream) must not carry a human sentence a
 * pipe would read as a record. `llm` and `json` keep their own empty shapes
 * on stdout: both are machine contracts whose consumers read one stream.
 *
 * @note Impure — reads `process.stdout.isTTY` for the render context.
 */
function renderData(
  verb: VerbSpec,
  flags: GlobalFlags,
  data: unknown,
  meta: Record<string, unknown>,
): DispatchOutcome {
  if (flags.format === "json") {
    const projection = JSON.parse(verb.output.formatters.json(data));
    return {
      stdout: `${JSON.stringify(successEnvelope(projection, meta))}\n`,
      exitCode: 0,
    };
  }
  if (flags.llm) {
    const text = verb.output.formatters.llm(data);
    return { stdout: text ? `${text}\n` : "", exitCode: 0 };
  }
  const context: RenderContext = {
    headers: flags.noHeaders !== true,
    stdoutIsTty: process.stdout.isTTY === true,
  };
  const text = verb.output.formatters.plain(data, context);
  // The calm zero-record notice is success-path guidance — `--quiet` mutes it.
  const notice =
    flags.quiet === true
      ? undefined
      : verb.output.formatters.emptyNotice?.(data);
  return {
    stdout: text ? `${text}\n` : "",
    ...(notice ? { stderr: `${notice}\n` } : {}),
    exitCode: 0,
  };
}

/**
 * Render a dry-run plan.
 *
 * The default render is the effect dump — one described effect per line — which
 * is what every verb without a plan of its own gets, byte for byte as before.
 * A verb that declares `output.formatPlan` renders that instead: the dump is
 * debug material (interpreter log effects, a repeated absolute path prefix on
 * every line), and a preview is something a user is meant to read.
 *
 * The JSON envelope is decided by the STASHED DATA, not by the seam: `plan` is
 * the same string array it always was, and `targets` appears only for a verb
 * that stashed a structured plan beside it. So a verb whose renderer works off
 * the effects alone leaves the machine-readable shape exactly as it found it.
 *
 * @param flags - The global flags (format selection, verbosity).
 * @param plan - The described effects the mutation would perform.
 * @param effects - Those same effects, unformatted, for the verb's renderer.
 * @param seam - The verb's plan renderer + whatever it stashed, when it has one.
 * @returns The dispatch outcome.
 */
async function renderPlan(
  flags: GlobalFlags,
  plan: readonly string[],
  effects: readonly Effect[],
  seam?: {
    format: (
      planData: unknown,
      effects: readonly Effect[],
      verbose: boolean,
    ) => string | Promise<string>;
    planData: unknown;
  },
): Promise<DispatchOutcome> {
  if (flags.format === "json") {
    const body =
      seam?.planData === undefined
        ? { plan }
        : { plan, targets: seam.planData };
    return {
      stdout: `${JSON.stringify(successEnvelope(body, { dryRun: true }))}\n`,
      exitCode: 0,
    };
  }
  if (seam !== undefined) {
    // Awaited: the seam MAY be async, so a renderer can load formatting rules
    // that live in another package behind a dynamic `import()` instead of
    // charging every `--help` spawn for them (see `VerbSpec.output.formatPlan`).
    const rendered = await seam.format(
      seam.planData,
      effects,
      flags.verbose === true,
    );
    return { stdout: `${rendered}\n`, exitCode: 0 };
  }
  const body =
    plan.length > 0
      ? `Dry run — planned effects:\n${plan.map((p) => `  - ${p}`).join("\n")}`
      : "Dry run — no effects.";
  return { stdout: `${body}\n`, exitCode: 0 };
}

/** Render the outcome of an undo. */
function renderUndo(flags: GlobalFlags, undone: number): DispatchOutcome {
  if (flags.format === "json") {
    return {
      stdout: `${JSON.stringify(successEnvelope({ undone }, { undo: true }))}\n`,
      exitCode: 0,
    };
  }
  return { stdout: `Undid ${undone} step(s).\n`, exitCode: 0 };
}

/** Render a caught error to stderr with a mapped exit code. */
function renderError(error: PragmaError, flags: GlobalFlags): DispatchOutcome {
  const rendered =
    flags.format === "json"
      ? renderErrorJson(error)
      : flags.llm
        ? renderErrorLlm(error)
        : renderErrorPlain(error);
  return { stderr: `${rendered}\n`, exitCode: mapExitCode(error.code) };
}

/**
 * Run a verb across the effect seam and produce its output.
 *
 * The testable core of {@link dispatch}: pure of process I/O, it returns what
 * to write rather than writing it, so tests (and the envelope-parity check)
 * can assert on the outcome directly.
 *
 * @param verb - The verb to run.
 * @param params - The coerced param bag.
 * @param mutation - The mutation flags (ignored for reads).
 * @param runtime - The booted runtime.
 * @returns The dispatch outcome.
 * @note Impure — a mutation's node/undo interpreter touches the filesystem.
 */
export async function executeVerb(
  verb: VerbSpec,
  params: Record<string, unknown>,
  mutation: MutationFlags,
  runtime: PragmaRuntime,
): Promise<DispatchOutcome> {
  const flags = runtime.globalFlags;

  // The lazy-store seam: boot the store (once, memoized) only for verbs that
  // declare they need it. A storeless verb never reaches the store factory, so
  // the storeless guarantee holds by construction (no STORE_SKIP triage).
  if (verb.capability.needsStore) {
    await runtime.store.get();
  }

  if (verb.capability.mutates) {
    // Tell the verb whether this is a plan-only preview (`--dry-run`) or a real
    // execution, so a network-touching mutation can stay offline for the plan.
    // Also hand it the interaction context so an interactive verb can pick its
    // prompt strategy. The verb's `run` sets `mutationRuntime.exec` (the runner
    // options) as its last act; the projector reads it back on the real-run
    // branch AND on the dry-run branch, which takes `cwd` (so the preview reads
    // the tree the run would write into) and `onEffectStart` (so the stamping
    // transform runs, and planned byte counts match written ones). It never
    // takes the prompt handler: a preview auto-answers prompts and so can never
    // block on input. `--undo` stays handler-free and untouched by this seam.
    const controller = new AbortController();
    const interaction: InteractionRuntime = {
      // The shared H3 gate (see cliIsTTY): stderr, never stdout.
      isTTY: cliIsTTY(),
      transport: "cli",
      yes: mutation.yes,
      signal: controller.signal,
      // Let an interactive verb's wizard abort the run on an in-Ink Ctrl-C (H2):
      // raw mode swallows SIGINT, so the keypress can't reach the SIGINT handler
      // below — the wizard drives this instead. `abort()` is idempotent.
      abort: () => controller.abort(),
    };
    const mutationRuntime: PragmaRuntime = {
      ...runtime,
      mutation: { preview: mutation.dryRun, undo: mutation.undo },
      interaction,
      // Progress seam (U7): a long mutation's eager resolve/build runs before its
      // Task is returned, so `onLog` can't reach it — stream stage lines straight
      // to stderr instead, keeping stdout (the JSON/data stream) clean.
      report:
        flags.quiet === true
          ? () => {}
          : (message: string) => process.stderr.write(`${message}\n`),
    };
    const task = await Promise.resolve(
      verb.run(params, mutationRuntime) as
        | Task<unknown>
        | Promise<Task<unknown>>,
    );
    if (mutation.dryRun) {
      // The HONEST preview (PR7): reads hit the real filesystem, writes are
      // recorded and never executed. A mutation whose real run would die on its
      // first template read now fails HERE too, so `--dry-run` exits nonzero
      // exactly when the run would — the plan is a prediction, not a wish.
      // `exec.cwd` is the same write root the real run resolves paths against,
      // and `exec.onEffectStart` carries summon's stamping transform, so the
      // planned byte counts are the bytes the run would actually write.
      //
      // NO `onLog`, deliberately. A preview that PERFORMS an effect is not a
      // preview of that effect: routing the recorded `Log`s to stderr printed
      // the generator's whole commentary on the way through, and the plan then
      // listed the very same lines as rows. The interpreter prints nothing of
      // its own when `onLog` is absent, so a log is now planned once and
      // performed never.
      const previewExec = mutationRuntime.exec ?? {};
      try {
        const { effects } = await runPreview(task, {
          cwd: previewExec.cwd,
          onEffectStart: previewExec.onEffectStart,
        });
        // A plan is the effects a mutation WOULD apply — a `Prompt` is not one,
        // so the interactive confirm gate / answer prompts never clutter it.
        const planned = effects.filter((effect) => effect._tag !== "Prompt");
        // The DESCRIBED plan — what `--format json` carries and what a verb
        // with no renderer of its own is dumped as — passes the same
        // visibility filter the MCP payload and the human preview use. It is
        // the filter, not the row format, that this seam shares: `plan` is
        // structured description, so it stays `describeEffect` strings rather
        // than terminal rows, and the two surfaces can be compared string for
        // string (`testing/behavioral/parity.test.ts`, A6).
        //
        // Loaded lazily from the LIGHT `/format` subpath. A dry run is already
        // several filesystem reads deep here; a `--help` spawn never reaches
        // this branch, and the kernel keeps summon-core off its static graph.
        const { visiblePlanEffects } = await import(
          "@canonical/summon-core/format"
        );
        const format = verb.output.formatPlan;
        return await renderPlan(
          flags,
          visiblePlanEffects(planned, flags.verbose === true).map(
            describeEffect,
          ),
          planned,
          format === undefined
            ? undefined
            : { format, planData: mutationRuntime.planData },
        );
      } finally {
        // A verb that mounted an interactive session before returning its Task
        // must be torn down on this branch too, exactly as on the real run.
        await previewExec.dispose?.();
      }
    }
    if (mutation.undo) {
      const { undoCount } = await runUndo(task, { onLog: logSink(flags) });
      return renderUndo(flags, undoCount);
    }
    // Real execution: spread the verb's runner options into the node
    // interpreter (prompt handler, stamping/progress callbacks, log routing,
    // signal). Teardown (e.g. unmount an Ink render) runs in `finally`.
    const exec = mutationRuntime.exec ?? {};
    const onSigint = (): void => controller.abort();
    process.once("SIGINT", onSigint);
    try {
      const value = await runTask(task, { onLog: logSink(flags), ...exec });
      return renderData(verb, flags, value, {});
    } finally {
      process.removeListener("SIGINT", onSigint);
      await exec.dispose?.();
    }
  }

  const data = await Promise.resolve(
    verb.run(params, runtime) as Promise<unknown>,
  );
  return renderData(verb, flags, data, {});
}

/**
 * Run a verb whose params are already prepared, then perform the output I/O —
 * the shared tail of {@link dispatch} and of a mounted subtree's own
 * dispatcher, which extracts its params by its own rules but reuses every
 * piece of the kernel machinery from here down: dry-run/undo/real-run
 * interpretation, error rendering, exit codes, SIGINT.
 *
 * @param verb - The verb spec to run.
 * @param getParams - Produces the coerced param bag (may throw a usage error;
 *   it is rendered exactly like a run error).
 * @param mutation - The mutation flags.
 * @param globalFlags - The parsed global flags.
 * @note Impure — writes stdout/stderr and sets `process.exitCode`.
 */
async function runPrepared(
  verb: VerbSpec,
  getParams: () => Record<string, unknown>,
  mutation: MutationFlags,
  globalFlags: GlobalFlags,
): Promise<void> {
  const runtime = bootRuntime(globalFlags);
  let outcome: DispatchOutcome;
  try {
    outcome = await executeVerb(verb, getParams(), mutation, runtime);
  } catch (error) {
    // Two clean, non-bug outcomes print the same "Cancelled." line but exit
    // differently — both set DIRECTLY here, out-of-band from `mapExitCode`'s
    // frozen {0,1,2,3} (see exitCodes.ts):
    //   - a DECLINE (confirm gate / at-prompt Ctrl-C) is a deliberate user
    //     choice, not a failure → success exit 0; and
    //   - an INTERRUPT (SIGINT on --yes/CI, or an in-wizard Ctrl-C mid-run) is
    //     an abort of work already underway → UNIX 128+SIGINT exit 130.
    // Everything else maps through the shared task-error bridge (which turns a
    // bad/absent non-interactive answer into a usage error, not an internal bug).
    outcome = isCancellation(error)
      ? { stderr: `${CANCELLED_MESSAGE}\n`, exitCode: EXIT.OK }
      : isInterruption(error)
        ? { stderr: `${CANCELLED_MESSAGE}\n`, exitCode: EXIT.INTERRUPTED }
        : renderError(asPragmaError(error), globalFlags);
  }

  if (outcome.stdout) writeStdout(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  if (outcome.exitCode !== 0) process.exitCode = outcome.exitCode;
}

/**
 * Dispatch a matched verb: coerce, run, and perform the output I/O.
 *
 * @param verb - The matched verb spec.
 * @param positionals - Positional args from Commander.
 * @param opts - Commander's parsed option values (incl. mutation flags).
 * @param globalFlags - The parsed global flags.
 * @note Impure — writes stdout/stderr and sets `process.exitCode`.
 */
export async function dispatch(
  verb: VerbSpec,
  positionals: readonly string[],
  opts: Record<string, unknown>,
  globalFlags: GlobalFlags,
): Promise<void> {
  const mutation: MutationFlags = {
    dryRun: opts.dryRun === true,
    undo: opts.undo === true,
    yes: opts.yes === true,
  };
  await runPrepared(
    verb,
    () => extractParams(verb.params, positionals, opts),
    mutation,
    globalFlags,
  );
}

/**
 * Dispatch a verb whose params were ALREADY extracted by the caller — the
 * seam a mounted subtree drives: its leaf specs carry no Commander defaults
 * (explicit stays distinguishable from default), so the mount extracts the
 * explicit answers itself and hands them here, reusing the whole kernel tail
 * (interpreters, rendering, exit codes, SIGINT) byte-for-byte.
 *
 * @param verb - The (possibly synthesized) verb spec to run.
 * @param params - The prepared param bag.
 * @param mutation - The mutation flags.
 * @param globalFlags - The parsed global flags.
 * @note Impure — writes stdout/stderr and sets `process.exitCode`.
 */
export async function dispatchPrepared(
  verb: VerbSpec,
  params: Record<string, unknown>,
  mutation: MutationFlags,
  globalFlags: GlobalFlags,
): Promise<void> {
  await runPrepared(verb, () => params, mutation, globalFlags);
}
