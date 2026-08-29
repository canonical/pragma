/**
 * The `setup` verbs — the run-all self-verb plus the five CLI-only sub-verbs
 * (`config`/`completions`/`lsp`/`mcp`/`skills`), every one of them derived from
 * the target table.
 *
 * `setup` is the ONE covenant noun that is BOTH directly runnable and has
 * sub-verbs. All of them are storeless, interactive mutations. The sub-verbs are
 * `mcp: false` (`buildServer` skips them, `buildProgram` still registers them);
 * only the self-verb is an MCP tool. `destructive: false` keeps MCP from
 * advertising the tool as destructive.
 *
 * THE SCOPE DEFAULT IS GLOBAL. `--scope` used to default to `both`, and `both`
 * runs each harness's own default scope — which is `project` for most of the
 * registry — so a bare `setup` scattered `.mcp.json`, `.gemini/settings.json`
 * and `opencode.json` into whatever directory you happened to be standing in.
 * The user scope is what a machine-level installer configures; the project scope
 * is a deliberate, checked-in, team-shared choice, and is now chosen with
 * `--local` rather than assumed.
 *
 * Every sub-verb registers the scope flags UNIFORMLY. That is what lets the scope
 * answer come from the table instead of per-verb flag wiring — previously
 * `setup completions --local` died as an unknown option, while `setup mcp
 * --local` worked, for no reason a user could see. Asking a target for a scope it
 * cannot honour is a usage error (exit 2) with the corrected command; asking the
 * RUN-ALL for such a band merely filters, and the out-of-band target still shows
 * as a named row.
 *
 * summon-core + the generator ops stay behind a LAZY dynamic import (mirroring
 * `create`'s `loadCreateRuntime`), so building the command tree / `--help` /
 * `__complete` — and `setup --yes` — load no React/Ink.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import { $, gen, pure, type Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/index.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type {
  CapabilityModule,
  ParamSpec,
  VerbSpec,
} from "../../kernel/spec/index.js";
import { resolveSetupMode, setupModeInput } from "./mode.js";
import {
  isActionable,
  planExitFailed,
  planTally,
  type SetupPlan,
  TARGET_IDS,
} from "./plan.js";
import {
  renderDetectionSummary,
  renderProgressLine,
  renderRecap,
} from "./plan.render.js";
import { renderDryRun, setupFormatters } from "./setup.render.js";
import type { Scope, ScopeSelection, SetupMode } from "./types.js";

/**
 * The `--scope` flag + its `--global`/`--local` boolean sugars. Registered by
 * EVERY setup verb, including the single-scope ones: a flag that exists on some
 * sub-verbs and not others is a grammar the user has to memorise, and the scope
 * a single-scope target can honour is a question the target table answers.
 *
 * `--global` is a synonym of the default; it stays for scripts and for symmetry
 * with `--local`.
 */
const SCOPE_PARAMS: readonly ParamSpec[] = [
  {
    kind: "enum",
    name: "scope",
    doc: "Where to configure: global (your home directory, the default), project (this repository), or both.",
    values: ["project", "global", "both"],
    default: "global",
  },
  {
    kind: "boolean",
    name: "global",
    doc: "Shorthand for --scope global — configure your home directory.",
  },
  {
    kind: "boolean",
    name: "local",
    doc: "Shorthand for --scope project — configure this project only.",
  },
];

/**
 * Resolve the `--scope`/`--global`/`--local` params into a single selection.
 * The boolean sugars win over `--scope`; `--global` wins over `--local`.
 *
 * @param params - The coerced param bag.
 * @returns The resolved scope selection (defaults to `global`).
 */
function resolveScope(params: Record<string, unknown>): ScopeSelection {
  if (params.global === true) return "global";
  if (params.local === true) return "project";
  const scope = params.scope;
  return scope === "project" || scope === "both" ? scope : "global";
}

/**
 * Reject a sub-verb asked for a scope its target cannot hold.
 *
 * This is a usage error, not a skip: the user typed a contradiction, and
 * correcting it is exactly what exit 2 means. The message names the scope the
 * target DOES have and prints the command that works, so the correction is one
 * paste rather than one manual page.
 *
 * @param mode - The sub-verb's target, or `all`.
 * @param scope - The resolved selection.
 * @throws PragmaError INVALID_INPUT when the target has no such scope.
 */
async function assertScopeIsPossible(
  mode: SetupMode,
  scope: ScopeSelection,
): Promise<void> {
  if (mode === "all" || scope === "both") return;
  const { findTarget } = await import("./targets.js");
  const target = findTarget(mode);
  if (target === undefined || target.scopes.includes(scope as Scope)) return;
  const only = target.scopes[0] as Scope;
  const level = only === "global" ? "global only" : "per-project only";
  const asked = scope === "global" ? "globally" : "per project";
  const corrected =
    only === "global"
      ? `${BIN_NAME} setup ${mode}`
      : `${BIN_NAME} setup ${mode} --local`;
  throw new PragmaError({
    code: "INVALID_INPUT",
    message: `${mode} is ${level} — it cannot be configured ${asked}.`,
    recovery: { message: `Run: ${corrected}` },
  });
}

/** The exposed-to-MCP capability the run-all self-verb declares. */
const SELF_CAPABILITY = {
  needsStore: false,
  mutates: true,
  interactive: true,
  destructive: false,
  mcp: {
    expose: true as const,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
};

/** The CLI-only capability every sub-verb declares (not an MCP tool). */
const SUB_CAPABILITY = {
  needsStore: false,
  mutates: true,
  interactive: true,
  destructive: false,
  mcp: {
    expose: false as const,
    reason: "CLI-only environment installer",
  },
};

/**
 * The one summon↔pragma seam per setup invocation: lazily load summon-core + the
 * generator ops, detect and plan, resolve the interaction mode, wire `rt.exec`,
 * and return the plan with its outcomes filled in.
 *
 * NOTE: `rt.exec` carries NO per-call `cwd`. Unlike `create` (whose generator
 * emits RELATIVE paths jailed to `rt.cwd`), setup's targets build ABSOLUTE
 * effect paths themselves; the interpreter leaves absolute paths unchanged, so
 * no per-call write root is threaded. No stamping either — setup writes
 * symlinks, config and scripts, not generated source.
 *
 * @param mode - Which entry point (`all` or one target).
 * @param rt - The per-invocation runtime (mutated: `rt.exec` and `rt.planData`).
 * @param scope - The resolved scope selection.
 * @returns The `Task<SetupPlan>` the dispatcher/MCP handler interprets.
 * @note Impure — runs every target's real detection before returning a Task.
 */
async function runSetup(
  mode: SetupMode,
  rt: PragmaRuntime,
  scope: ScopeSelection,
): Promise<Task<SetupPlan>> {
  await assertScopeIsPossible(mode, scope);

  // Lazy dynamic imports (lazy-React discipline): summon-core's barrel is
  // React-free, and the non-TTY branch picks autoPrompt/mcpPrompt (never mounts
  // Ink), so `setup --yes` loads no React — the guard test enforces this.
  const [summon, projection, ops] = await Promise.all([
    import("@canonical/summon-core"),
    import("@canonical/summon-core/projection"),
    import("./operations/setupGenerator.js"),
  ]);

  const input = setupModeInput(rt);
  const run = await ops.buildSetupRun(rt, mode, scope, input.undo);
  const interactionMode = resolveSetupMode(input, projection.decideInteraction);

  // The dry-run seam: the kernel's `--dry-run` branch renders THIS instead of
  // the raw effect dump, while its honest preview still runs underneath and
  // still fails exactly when the real run would.
  rt.planData = { ...run.plan, preview: true };

  // Whether this invocation only PREVIEWS. The task below is driven either way
  // — that is what makes the preview honest — so anything it says out loud has
  // to know which of the two it is.
  const previewing = interactionMode === "batch-dry-run";

  // The undo truth channel. A real `--undo` interprets this verb's task ONLY
  // as the undo interpreter's mocked collection walk — every exec exits 0,
  // every prompt answers its default, and the OutcomeSink is never written —
  // so nothing the task body could report describes what the collected
  // reversals later did. The body therefore says NOTHING on the undo path
  // (see the guard in the gen body below); the kernel calls this seam after
  // the reversals actually ran, handing over the interpreter's per-undo
  // outcomes, and `appliedUndo` projects them onto the rows through the SAME
  // sink + `applied` path the forward run reports through. One outcome
  // model, both directions.
  if (!previewing && input.undo) {
    rt.undoReport = (outcomes) => {
      const applied = run.appliedUndo(outcomes);
      const width = Math.max(...applied.rows.map((row) => row.target.length));
      for (const row of applied.rows) {
        if (row.outcome === undefined) continue;
        rt.report?.(renderProgressLine(row, width));
      }
      if (planExitFailed(applied)) {
        rt.report?.(renderRecap(applied, "Removed"));
        raiseFailedRows(applied, true);
      }
    };
  }

  // A CONVERGED machine has no question to ask. Every row is `none` or `skip`,
  // so nothing composes an effect — and the wizard's confirm gate then mounted
  // Ink to render summon-core's "No operations planned." above a "Proceed?"
  // over an empty tally. For a sub-verb, whose prompt list is empty, that
  // contentless gate was the FIRST AND ONLY thing the user ever saw. The
  // explanation existed the whole time (each row's `none` detail, one child row
  // per file/editor marked `unchanged`) and was dropped at the render seam.
  //
  // So: report the plan instead of asking a question with no content. There is
  // no `preview: true` here — the run really did complete. `applied({})` marks
  // each `none` row `{status:"noop", note:"unchanged"}`, `wasApplied` is then
  // true, and `setupFormatters.plain` renders the recap. That also retires a
  // second defect: a non-interactive converged run used to print the misleading
  // "Nothing was applied. Run again with --yes to apply." over an all-`none`
  // plan. A run whose every DETECTION threw is not converged in this sense —
  // its rows are skips that report `failed` — so it falls through to the normal
  // path, which is the one that raises.
  if (!previewing && run.plan.rows.every((row) => !isActionable(row.action))) {
    const converged = run.applied({});
    if (!planExitFailed(converged)) return pure<SetupPlan>(converged);
  }

  // Adaptation (b): a non-interactive run without `--yes` previews rather than
  // mutating. It is the same plan the dry-run prints, plus one hint line, at
  // exit 0 — the invocation completed a real read-only unit of work.
  if (interactionMode === "refuse") {
    return pure<SetupPlan>({ ...run.plan, preview: true });
  }

  // Say what was DETECTED before asking anything about it. The data has been
  // sitting in `run.plan` since before the prompt list was built — `inkPrompt`
  // mounts no React until the first Prompt effect — so this is a rendering gap,
  // not an ordering one, and closing it is nearly free.
  //
  // It MUST be emitted here, before `execute` is driven: the summary and the
  // Ink frame both write to stderr, and only a line written first lands in
  // scrollback ABOVE the frame. `rt.report` is the non-Ink seam — `--quiet`
  // silences it and it is a no-op over MCP — so no React is loaded to print it.
  // A preview says nothing here: the plan table IS its output.
  if (!previewing) {
    const summary = renderDetectionSummary(run.plan, {
      verbose: rt.globalFlags.verbose,
    });
    if (summary !== undefined) rt.report?.(summary);
  }

  const { transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };

  // TTY without --yes → the Ink wizard (recap + live progress). Its callbacks
  // ride rt.exec; `onCancel` threads the run's abort in so an in-Ink Ctrl-C
  // during execution actually stops the writes.
  let task: Task<GeneratorResult>;
  const wizard = interactionMode === "wizard";
  if (wizard) {
    const session = summon.inkPrompt(run.generator, {
      signal,
      onCancel: abort,
    });
    // Live progress in the PLAN's units, not the interpreter's: the wizard's
    // default execution view is the per-effect transcript — right for `create`,
    // whose unit of work IS the file, and wrong here, where one unit is one
    // configured target and the transcript renders eighteen symlink rows for
    // the row the plan called `skills  link  9 skills → 2 folders`. Each row
    // event carries the SAME sentence `renderProgressLine` prints, so the
    // watcher and the recap reader see one dialect. `--verbose` withholds the
    // listener, which falls the wizard back to the full effect transcript —
    // the same detected-only-unless-verbose rule the detection summary and
    // doctor already follow.
    if (rt.globalFlags.verbose !== true) {
      run.setRowListener((event) => session.reportStep(event));
    }
    rt.exec = {
      promptHandler: session.promptHandler,
      onEffectStart: session.onEffectStart,
      onEffectComplete: session.onEffectComplete,
      onLog: session.onLog,
      dispose: session.dispose,
      signal,
    };
    task = summon.execute(run.generator, {
      prompt: session.promptHandler,
      params: {},
      signal,
    });
  } else {
    // Non-interactive: MCP → params-or-error; CLI/--yes/CI → defaults.
    const prompt =
      transport === "mcp" ? summon.mcpPrompt({}) : summon.autoPrompt({});
    rt.exec = {
      promptHandler: prompt,
      onLog: (_level, message) => process.stderr.write(`${message}\n`),
      signal,
    };
    task = summon.execute(run.generator, { prompt, params: {}, signal });
  }

  return gen(function* () {
    const result = yield* $(task);
    const applied = run.applied(result.answers);

    // A real `--undo` only ever drives this body under the undo
    // interpreter's COLLECTION walk, with every effect mocked. `applied` is
    // then a projection of the mocked walk (`removed` rows for reversals
    // that have not run yet), so reporting it here printed green checks
    // before anything happened. Say nothing; the kernel hands the executed
    // reversals' outcomes to `rt.undoReport` afterwards, and `appliedUndo`
    // grades the rows from those. (`--undo --dry-run` stays on the shared
    // preview path below, where the same suppressions already apply.)
    if (input.undo && !previewing) return applied;

    // Progress: one line per row on stderr for an unattended run (the Ink
    // session already draws them for the wizard). stdout stays the data stream.
    //
    // A dry run reports NOTHING here. Its honest preview drives this very task
    // with writes recorded, so the progress lines ran for real and announced
    // "✓ config — installed" above a plan that had installed nothing.
    if (!previewing && (!wizard || yes)) {
      const width = Math.max(...applied.rows.map((row) => row.target.length));
      for (const row of applied.rows) {
        if (row.outcome === undefined) continue;
        rt.report?.(renderProgressLine(row, width));
      }
    }

    // A failed row exits 1, and the recap is still shown — partial success is
    // first class, so the run reports every row before naming the ones that did
    // not happen. The recap goes to stderr here because the error renderer owns
    // stdout on a failing run.
    if (planExitFailed(applied)) {
      rt.report?.(renderRecap(applied));
      raiseFailedRows(applied);
    }
    return applied;
  });
}

/**
 * Raise the run's failure from its rows — shared by the forward run's recap
 * and the post-undo truth report, so the two paths name a shortfall in the
 * same words. `undo` only re-words the multi-failure recovery line: the
 * command that retries a removal is `setup <target> --undo`, not the
 * installer.
 *
 * @param applied - The plan with outcomes filled in (at least one `failed`).
 * @param undo - Whether the failed run was a removal.
 * @throws PragmaError naming the failed row(s), always.
 */
function raiseFailedRows(applied: SetupPlan, undo = false): never {
  const failed = applied.rows.filter((row) => row.outcome?.status === "failed");

  // ONE failure reports itself. The row already carries the cause it was
  // given ("`bun` is not found on your PATH") and a remedy that runs on
  // this machine; replacing them with a count would throw away the only
  // two sentences that say what is wrong and what to do about it.
  const only = failed.length === 1 ? failed[0] : undefined;
  if (only?.outcome !== undefined) {
    throw new PragmaError({
      code: "UNSUPPORTED",
      message: `${only.target}: ${only.outcome.note ?? "the step did not complete"}`,
      ...(only.outcome.remedy === undefined
        ? {}
        : { recovery: { message: only.outcome.remedy } }),
    });
  }

  // Several failures: name every one with its own cause, then point at the
  // recap above. A bare list of target names would make the reader re-run
  // each one to find out why it failed.
  const named = failed
    .map((row) => `${row.target} (${row.outcome?.note ?? "no cause recorded"})`)
    .join("; ");
  throw new PragmaError({
    code: "UNSUPPORTED",
    message: `${failed.length} of ${planTally(applied).accountable} targets did not complete: ${named}.`,
    recovery: {
      message: `The other targets are ${undo ? "removed" : "configured"}. Re-run the ones that did not complete: ${failed
        .map(
          (row) =>
            `\`${BIN_NAME} setup ${row.target}${undo ? " --undo" : ""}\``,
        )
        .join(", ")}.`,
    },
  });
}

/** Build a setup verb bound to its {@link SetupMode}. */
function setupVerb(
  path: VerbSpec<Record<string, unknown>, SetupPlan>["path"],
  summary: string,
  mode: SetupMode,
  capability: typeof SELF_CAPABILITY | typeof SUB_CAPABILITY,
  extras: Partial<VerbSpec<Record<string, unknown>, SetupPlan>> = {},
): VerbSpec<Record<string, unknown>, SetupPlan> {
  return {
    path,
    summary,
    params: SCOPE_PARAMS,
    output: {
      formatters: setupFormatters,
      // The kernel's dry-run branch renders the plan through this seam instead
      // of dumping raw effects. Absent on every other verb, so nothing else
      // changes shape.
      formatPlan: (planData) => renderDryRun(planData as SetupPlan),
    },
    capability,
    ...extras,
    run: (params, rt) =>
      runSetup(mode, rt, resolveScope(params)) as unknown as Task<SetupPlan>,
  };
}

const setupAllVerb = setupVerb(
  ["setup"],
  "Set up your config file, TAB completion, the editor extension, MCP, and skills.",
  "all",
  SELF_CAPABILITY,
  {
    doc: "Shows what each target needs, then applies the ones you keep. Everything is configured in your home directory by default; the scope option moves the run to this project alone, or covers both. Without an attended terminal the plan is printed and nothing is written unless the run is explicitly confirmed.",
    examples: [
      { cmd: `${BIN_NAME} setup` },
      {
        cmd: `${BIN_NAME} setup --dry-run`,
        note: "show the plan, write nothing",
      },
      {
        cmd: `${BIN_NAME} setup --local`,
        note: "configure this project instead of your home directory",
      },
      {
        cmd: `${BIN_NAME} setup mcp`,
        note: "only register the MCP server",
      },
    ],
  },
);

const configVerb = setupVerb(
  ["setup", "config"],
  "Create your global config file, filled in with the defaults.",
  "config",
  SUB_CAPABILITY,
);

const mcpVerb = setupVerb(
  ["setup", "mcp"],
  `Register the ${BIN_NAME} MCP server with the AI harnesses on this machine.`,
  "mcp",
  SUB_CAPABILITY,
);

const completionsVerb = setupVerb(
  ["setup", "completions"],
  "Install TAB completion for the shell you are running.",
  "completions",
  SUB_CAPABILITY,
);

const skillsVerb = setupVerb(
  ["setup", "skills"],
  "Link the skills you have installed into every AI harness that reads them.",
  "skills",
  SUB_CAPABILITY,
);

const lspVerb = setupVerb(
  ["setup", "lsp"],
  "Install the Terrazzo design-token extension into your VS Code-family editors.",
  "lsp",
  SUB_CAPABILITY,
);

/** The `setup` capability module (run-all self-verb + five CLI-only sub-verbs). */
export const setupModule: CapabilityModule = {
  name: "setup",
  verbs: [
    asVerb(setupAllVerb),
    asVerb(configVerb),
    asVerb(completionsVerb),
    asVerb(lspVerb),
    asVerb(mcpVerb),
    asVerb(skillsVerb),
  ],
};

/** Re-exported so the covenant emitter and tests can name the target set. */
export { TARGET_IDS };
