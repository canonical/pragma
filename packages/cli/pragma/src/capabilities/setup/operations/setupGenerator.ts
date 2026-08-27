/**
 * Synthesize a setup invocation as a summon `GeneratorDefinition` driven by the
 * TARGET TABLE, so the run-all and every sub-verb flow through the same
 * `execute` seam `create` uses — inheriting the Ink wizard, the recap/confirm
 * gate, live progress, colours, and the shared cancel fixes by construction.
 *
 * The shape mirrors `create`: detection runs FOR REAL up front (once per
 * target/band, in `detectTargets`), then a PURE `generate` composes only the
 * effects for the SELECTED rows. `generate` must stay re-interpretable —
 * `execute` invokes it more than once (the confirm-gate preview and the build) —
 * so it is composed from combinators and does no reads of its own.
 *
 * The wizard is the PLAN'S EDITOR, not a parallel path: its choices are the plan
 * rows, and what it edits is each row's `selected` flag. There is exactly one
 * list of things this command can do, and the preview, the wizard, the progress
 * lines and the recap are four views of it.
 *
 * This module carries NO static import of `@canonical/summon-core` VALUES or of
 * React/Ink — it only `import type`s the generator shape and builds plain object
 * literals over `@canonical/task`. It is itself reached only through the verb's
 * lazy dynamic import, so the fast paths stay free of it.
 */

import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  flatMap,
  pure,
  recover,
  sequence_,
  type Task,
  type TaskError,
  warn,
} from "@canonical/task";
import { BIN_NAME } from "../../../constants.js";
import { PragmaError } from "../../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import {
  buildPlan,
  type DetectedRow,
  detectTargets,
  draftFor,
  resolveRoots,
} from "../buildPlan.js";
import {
  isActionable,
  type PlanOutcome,
  type PlanRow,
  type SetupPlan,
  TARGET_IDS,
  type TargetId,
  withRows,
} from "../plan.js";
import type { ScopeBand, ScopeSelection, SetupMode } from "../types.js";

/** The answer key the run-all's row multiselect writes. */
const ROWS_ANSWER = "targets";

/** The answer key the opt-in per-file MCP narrowing writes. */
const MCP_FILES_ANSWER = "mcpTargets";

/** A row's identity in an answer bag: band-qualified, so `both` stays unambiguous. */
const rowKey = (band: ScopeBand, target: TargetId): string =>
  `${band}:${target}`;

/**
 * A ready-to-run setup invocation: the plan as detected, the synthesized
 * generator, and a projection from the completed answers back onto the plan with
 * outcomes filled in — the recap, and the `--format json` body.
 */
export interface SetupRun {
  readonly plan: SetupPlan;
  readonly generator: GeneratorDefinition;
  /** The plan with the wizard's selection and the run's outcomes applied. */
  applied(answers: Record<string, unknown>): SetupPlan;
}

/**
 * Where a failed row's error lands during interpretation.
 *
 * Per-row failure isolation needs somewhere to put "row X failed with Y", and
 * `execute` yields only the generator's answers and effects — the value of the
 * composed task is discarded. So the recover handlers record here, and the head
 * of the sequence CLEARS it: `generate` is invoked fresh per interpretation, so
 * the clear runs first on every drive and the last drive (the real one, which
 * follows `execute`'s mocked preview) is the one whose records survive. The
 * composition itself stays pure and re-interpretable — nothing is captured in
 * the task, only written while it runs.
 */
class OutcomeSink {
  private readonly errors = new Map<string, TaskError>();

  /** Forget every recorded failure — run at the head of each interpretation. */
  clear(): void {
    this.errors.clear();
  }

  record(key: string, error: TaskError): void {
    this.errors.set(key, error);
  }

  get(key: string): TaskError | undefined {
    return this.errors.get(key);
  }

  get failureCount(): number {
    return this.errors.size;
  }
}

/** The {@link PragmaError} a row failure carries, or a wrapper around it. */
const rowPragmaError = (error: TaskError): PragmaError =>
  error.cause instanceof PragmaError
    ? error.cause
    : new PragmaError({ code: "UNSUPPORTED", message: error.message });

/**
 * Run the chosen rows with per-row failure isolation. The rows are independent
 * installers, so one unsatisfiable prerequisite must not consume the others: a
 * sequenced composition let a failing editor sideload abort the run before MCP
 * or skills ever executed, so on every machine without a usable editor CLI the
 * single advertised onboarding command configured nothing that mattered.
 *
 * Each row runs under a `recover` frame: the failure is reported inline (a
 * `warn` right where it happened), recorded on the sink, and the remaining rows
 * still run. The aggregate outcome is decided afterwards by the caller reading
 * the sink — a run whose every failure is recorded does NOT rethrow, because the
 * recap is the report and the exit code comes from the plan's own rule.
 *
 * Only failures travelling the task FAILURE CHANNEL are isolable — a synchronous
 * throw bypasses the trampoline's recovery frames — which is why the row bodies
 * raise via `checkExecOk`/`failPragma`, never a bare throw. Interruption bypasses
 * recovery by interpreter invariant, so Ctrl-C still stops the whole run.
 */
const runRowsIsolated = (
  sink: OutcomeSink,
  rows: readonly { key: string; task: Task<void> }[],
): Task<void> =>
  flatMap(pure(undefined), (): Task<void> => {
    sink.clear();
    return sequence_(
      rows.map(({ key, task }) =>
        recover(task, (error) =>
          flatMap(
            warn(
              `The ${key.split(":")[1]} step did not complete — continuing with the remaining targets.`,
            ),
            () => {
              sink.record(key, error);
              return pure(undefined);
            },
          ),
        ),
      ),
    );
  });

/** Build a generator's `meta` (no stamping — the version is just header text). */
const buildMeta = (
  rt: PragmaRuntime,
  title: string,
): GeneratorDefinition["meta"] => ({
  name: title,
  displayName: title,
  description: `Configure ${BIN_NAME} on this machine`,
  version: rt.version,
});

/** Read a multiselect answer as a string array. */
const readList = (
  answers: Record<string, unknown>,
  key: string,
): string[] | undefined =>
  Array.isArray(answers[key]) ? (answers[key] as string[]) : undefined;

/**
 * The wizard's row multiselect — its choices ARE the plan rows. Actionable rows
 * are pre-selected; an already-current row is offered DE-selected, so a re-run
 * never proposes to rewrite what is already correct. A skip row is not a choice
 * at all (summon's choice shape has no disabled state) but stays a visible row
 * in the plan and the recap, carrying its reason.
 */
const buildRowsPrompt = (plan: SetupPlan): PromptDefinition => {
  const choices = plan.rows
    .filter((row) => row.action !== "skip")
    .map((row) => ({
      label: `${row.target} — ${row.detail}${row.action === "none" ? " (already configured)" : ""}`,
      value: rowKey(row.band, row.target),
    }));
  return {
    name: ROWS_ANSWER,
    type: "multiselect",
    message: "Which targets would you like to configure?",
    choices,
    default: plan.rows
      .filter((row) => row.selected)
      .map((row) => rowKey(row.band, row.target)),
  };
};

/** The opt-in "customize which files" gate — defaults to false. */
const buildCustomizePrompt = (
  when?: PromptDefinition["when"],
): PromptDefinition => ({
  name: "customize",
  type: "confirm",
  message: `Customize which files ${BIN_NAME} configures?`,
  default: false,
  when,
});

/**
 * The per-file MCP multiselect — one row per deduplicated config file, across
 * every band the run covers. An already-current file is DEFAULT-DESELECTED; a
 * file that is absent or drifted stays selected. Retained unchanged from the
 * landed opt-in narrowing: it is row-level CHILD selection, which is exactly
 * what the plan's child rows are.
 */
const buildMcpFilesPrompt = (
  plan: SetupPlan,
  when?: PromptDefinition["when"],
): PromptDefinition => {
  const children = plan.rows
    .filter((row) => row.target === "mcp")
    .flatMap((row) => row.children ?? []);
  return {
    name: MCP_FILES_ANSWER,
    type: "multiselect",
    message: "Configure MCP for which files?",
    when,
    choices: children.map((child) => ({
      label: `${child.label} — ${child.action}`,
      value: child.key,
    })),
    default: children
      .filter((child) => child.action !== "unchanged")
      .map((child) => child.key),
  };
};

/** Whether a row was chosen: by the wizard's answer, else by its own default. */
const isChosen = (
  row: PlanRow,
  chosen: readonly string[] | undefined,
): boolean =>
  row.action !== "skip" &&
  (chosen === undefined
    ? row.selected
    : chosen.includes(rowKey(row.band, row.target)));

/**
 * What a row DID, as a past-tense word. The row's detail says what and where;
 * the note says what happened to it, so a progress line and a recap line read
 * as sentences rather than as two halves of one.
 */
const ACTION_NOTES: Record<string, string> = {
  install: "installed",
  update: "updated",
  link: "linked",
  remove: "removed",
};

/** The `2 added, 1 updated` note an MCP row's children produce. */
function childNote(row: PlanRow): string | undefined {
  const children = row.children;
  if (children === undefined || children.length === 0) return undefined;
  const count = (action: string): number =>
    children.filter((child) => child.action === action).length;
  const parts = [
    count("add") > 0 ? `${count("add")} added` : "",
    count("update") > 0 ? `${count("update")} updated` : "",
    count("unchanged") > 0 ? `${count("unchanged")} unchanged` : "",
  ].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Build one invocation: detect, plan, synthesize the generator, and expose the
 * projection back onto the plan.
 *
 * @param rt - The per-invocation runtime.
 * @param mode - The entry point: the run-all, or one target.
 * @param scope - The resolved band selection.
 * @param removal - Compose the removal (`--undo`) instead of the install.
 * @returns The plan, the generator, and the answers-to-plan projection.
 * @note Impure — runs every selected target's real detection.
 */
export async function buildSetupRun(
  rt: PragmaRuntime,
  mode: SetupMode,
  scope: ScopeSelection,
  removal = false,
): Promise<SetupRun> {
  const ids: TargetId[] = mode === "all" ? [...TARGET_IDS] : [mode as TargetId];
  const roots = await resolveRoots(rt);
  const detected = await detectTargets(rt, ids, scope);
  const plan = buildPlan(scope, roots, detected, ids, removal);
  const sink = new OutcomeSink();

  const prompts: PromptDefinition[] = [];
  if (mode === "all") prompts.push(buildRowsPrompt(plan));
  const mcpChildren = plan.rows
    .filter((row) => row.target === "mcp")
    .flatMap((row) => row.children ?? []);
  if (!removal && mcpChildren.length > 1) {
    const mcpChosen = (answers: Record<string, unknown>): boolean => {
      const chosen = readList(answers, ROWS_ANSWER);
      return plan.rows.some(
        (row) => row.target === "mcp" && isChosen(row, chosen),
      );
    };
    prompts.push(
      buildCustomizePrompt(mcpChosen),
      buildMcpFilesPrompt(
        plan,
        (answers) => answers.customize === true && mcpChosen(answers),
      ),
    );
  }

  /** The detection behind a row, for composing and for re-reading its draft. */
  const detectionFor = (row: PlanRow): DetectedRow | undefined =>
    detected.find((d) => d.target.id === row.target && d.band === row.band);

  const generator: GeneratorDefinition = {
    meta: buildMeta(
      rt,
      mode === "all" ? `${BIN_NAME} setup` : `${BIN_NAME} setup ${mode}`,
    ),
    prompts,
    generate: (answers) => {
      const chosen = readList(answers, ROWS_ANSWER);
      const files = readList(answers, MCP_FILES_ANSWER);
      const tasks = plan.rows.flatMap((row) => {
        if (!isChosen(row, chosen)) return [];
        const hit = detectionFor(row);
        if (hit === undefined) return [];
        const task = removal
          ? hit.target.composeRemoval(hit.detection)
          : hit.target.compose(hit.detection, files);
        return [{ key: rowKey(row.band, row.target), task }];
      });
      return runRowsIsolated(sink, tasks);
    },
  };

  /** The outcome one row ended in, read off the sink and its own draft. */
  const outcomeFor = (
    row: PlanRow,
    chosen: readonly string[] | undefined,
  ): PlanOutcome | undefined => {
    const hit = detectionFor(row);
    const draft = hit === undefined ? undefined : draftFor(hit, roots, removal);
    if (row.action === "skip") {
      return {
        status: "skipped",
        ...(draft?.remedy === undefined ? {} : { remedy: draft.remedy }),
      };
    }
    if (!isChosen(row, chosen)) return undefined;
    const error = sink.get(rowKey(row.band, row.target));
    if (error !== undefined) {
      const pragma = rowPragmaError(error);
      return {
        status: "failed",
        note: pragma.message,
        ...(pragma.recovery?.message === undefined
          ? {}
          : { remedy: pragma.recovery.message }),
      };
    }
    if (!isActionable(row.action)) return { status: "noop" };
    const note = childNote(row) ?? ACTION_NOTES[row.action];
    return {
      status: removal ? "removed" : "done",
      ...(note === undefined ? {} : { note }),
    };
  };

  return {
    plan,
    generator,
    applied: (answers) => {
      const chosen = readList(answers, ROWS_ANSWER);
      return withRows(
        plan,
        plan.rows.map((row): PlanRow => {
          const outcome = outcomeFor(row, chosen);
          return {
            ...row,
            selected: isChosen(row, chosen),
            ...(outcome === undefined ? {} : { outcome }),
          };
        }),
      );
    },
  };
}
