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

import { describeEffect, dryRun, type Task } from "@canonical/task";
import { runTask, runUndo } from "@canonical/task/node";
import { PragmaError } from "../../error/PragmaError.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "../../error/renderError.js";
import { successEnvelope } from "../../render/envelope.js";
import { selectFormatter } from "../../render/formatters.js";
import { writeStdout } from "../../render/writeStdout.js";
import { bootRuntime } from "../../runtime/boot.js";
import type {
  GlobalFlags,
  InteractionRuntime,
  PragmaRuntime,
} from "../../runtime/types.js";
import type { ParamSpec, VerbSpec } from "../../spec/types.js";
import { mapExitCode } from "./exitCodes.js";

/** The CLI-only mutation flags auto-injected onto every mutating verb. */
export interface MutationFlags {
  readonly dryRun: boolean;
  readonly undo: boolean;
  readonly yes: boolean;
}

/**
 * Route a Task's log effects to stderr. The interpreter otherwise falls back to
 * `console.log` (stdout), which would corrupt the `--format json` / MCP stdio
 * data stream; diagnostics belong on stderr.
 */
const logToStderr = (_level: string, message: string): void => {
  process.stderr.write(`${message}\n`);
};

/** The result of running a verb: what to write where, and the exit code. */
export interface DispatchOutcome {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly exitCode: number;
}

/** Coerce one raw arg into the type its {@link ParamSpec} declares. */
function coerceParam(param: ParamSpec, raw: unknown): unknown {
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

/** Render a read/execute result through the verb's formatters. */
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
  const text = selectFormatter(flags, verb.output.formatters)(data);
  return { stdout: text ? `${text}\n` : "", exitCode: 0 };
}

/** Render a dry-run plan (the effects a mutation would perform). */
function renderPlan(
  flags: GlobalFlags,
  plan: readonly string[],
): DispatchOutcome {
  if (flags.format === "json") {
    return {
      stdout: `${JSON.stringify(successEnvelope({ plan }, { dryRun: true }))}\n`,
      exitCode: 0,
    };
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
    // branch only — the dry-run/undo branches stay handler-free (they mock
    // prompts), so `--dry-run`/`--undo` are unchanged by this seam.
    const controller = new AbortController();
    const interaction: InteractionRuntime = {
      isTTY: process.stdin.isTTY === true && process.stdout.isTTY === true,
      transport: "cli",
      yes: mutation.yes,
      signal: controller.signal,
    };
    const mutationRuntime: PragmaRuntime = {
      ...runtime,
      mutation: { preview: mutation.dryRun },
      interaction,
    };
    const task = await Promise.resolve(
      verb.run(params, mutationRuntime) as
        | Task<unknown>
        | Promise<Task<unknown>>,
    );
    if (mutation.dryRun) {
      // A plan is the effects a mutation WOULD apply — a `Prompt` is not one, so
      // the interactive confirm gate / answer prompts never clutter the preview.
      return renderPlan(
        flags,
        dryRun(task)
          .effects.filter((effect) => effect._tag !== "Prompt")
          .map(describeEffect),
      );
    }
    if (mutation.undo) {
      const { undoCount } = await runUndo(task, { onLog: logToStderr });
      return renderUndo(flags, undoCount);
    }
    // Real execution: spread the verb's runner options into the node
    // interpreter (prompt handler, stamping/progress callbacks, log routing,
    // signal). Teardown (e.g. unmount an Ink render) runs in `finally`.
    const exec = mutationRuntime.exec ?? {};
    const onSigint = (): void => controller.abort();
    process.once("SIGINT", onSigint);
    try {
      const value = await runTask(task, { onLog: logToStderr, ...exec });
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
  const runtime = bootRuntime(globalFlags);
  let outcome: DispatchOutcome;
  try {
    const params = extractParams(verb.params, positionals, opts);
    const mutation: MutationFlags = {
      dryRun: opts.dryRun === true,
      undo: opts.undo === true,
      yes: opts.yes === true,
    };
    outcome = await executeVerb(verb, params, mutation, runtime);
  } catch (error) {
    const pragmaError =
      error instanceof PragmaError
        ? error
        : PragmaError.internalError(
            error instanceof Error ? error.message : String(error),
          );
    outcome = renderError(pragmaError, globalFlags);
  }

  if (outcome.stdout) writeStdout(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  if (outcome.exitCode !== 0) process.exitCode = outcome.exitCode;
}
