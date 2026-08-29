/**
 * Synthesize a setup invocation as a summon `GeneratorDefinition` driven by the
 * TARGET TABLE, so the run-all and every sub-verb flow through the same
 * `execute` seam `create` uses — inheriting the Ink wizard, the recap/confirm
 * gate, live progress, colours, and the shared cancel fixes by construction.
 *
 * The shape mirrors `create`: detection runs FOR REAL up front (once per
 * target/scope, in `detectTargets`), then a PURE `generate` composes only the
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
import { PragmaError } from "../../../kernel/error/index.js";
import type { PragmaRuntime } from "../../../kernel/runtime/index.js";
import {
  buildPlan,
  type DetectedRow,
  detectionFailure,
  detectTargets,
  draftFor,
  resolveRoots,
} from "../buildPlan.js";
import {
  isActionable,
  type PlanChildRow,
  type PlanOutcome,
  type PlanRow,
  type SetupPlan,
  TARGET_IDS,
  type TargetId,
  withRows,
} from "../plan.js";
import type { Scope, ScopeSelection, SetupMode } from "../types.js";

/** The answer key the run-all's row multiselect writes. */
const ROWS_ANSWER = "targets";

/** The answer key the opt-in per-file MCP narrowing writes. */
const MCP_FILES_ANSWER = "mcpTargets";

/** The answer key the opt-in per-editor LSP narrowing writes. */
const LSP_EDITORS_ANSWER = "lspEditors";

/** Which answer key carries a target's per-child selection, if it has one. */
const CHILD_ANSWER: Partial<Record<TargetId, string>> = {
  mcp: MCP_FILES_ANSWER,
  lsp: LSP_EDITORS_ANSWER,
};

/** A row's identity in an answer bag: scope-qualified, so `both` stays unambiguous. */
const rowKey = (scope: Scope, target: TargetId): string => `${scope}:${target}`;

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
      value: rowKey(row.scope, row.target),
    }));
  return {
    name: ROWS_ANSWER,
    type: "multiselect",
    message: "Which targets would you like to configure?",
    choices,
    default: plan.rows
      .filter((row) => row.selected)
      .map((row) => rowKey(row.scope, row.target)),
  };
};

/**
 * The per-file MCP multiselect — one row per deduplicated config file, across
 * every scope the run covers. An already-current file is DEFAULT-DESELECTED; a
 * file that is absent or drifted stays selected. It is row-level CHILD
 * selection, which is exactly what the plan's child rows are.
 *
 * It used to sit behind a meta-question — "Customize which files pragma
 * configures?", answered no by default. That gate was read in exactly ONE place
 * in the repo (this prompt's `when`) and nowhere else: not by `generate`, not by
 * `applied`, not by any plan, recap, renderer or JSON projection. Answering no
 * meant the child prompt was never asked, its key was absent from the answer
 * bag, `readList` returned `undefined`, and the compose bodies read that as
 * "all" — so everything detected was configured anyway. A meta-question in front
 * of a direct question is one more thing to answer and no more control; the
 * choices below already carry the detected state per child (`— unchanged`,
 * `— add`, `— update`), which is the answer the meta-question was standing in
 * front of.
 */
const buildChildPrompt = (
  plan: SetupPlan,
  target: TargetId,
  message: string,
  when?: PromptDefinition["when"],
): PromptDefinition => {
  const children = childrenOf(plan, target);
  return {
    name: CHILD_ANSWER[target] as string,
    type: "multiselect",
    message,
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

/** Every child row a target contributes, across the scopes in the plan. */
const childrenOf = (
  plan: SetupPlan,
  target: TargetId,
): readonly PlanChildRow[] =>
  plan.rows
    .filter((row) => row.target === target)
    .flatMap((row) => row.children ?? []);

/** Whether a row was chosen: by the wizard's answer, else by its own default. */
const isChosen = (
  row: PlanRow,
  chosen: readonly string[] | undefined,
): boolean =>
  row.action !== "skip" &&
  (chosen === undefined
    ? row.selected
    : chosen.includes(rowKey(row.scope, row.target)));

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

/**
 * The `2 added, 1 updated` note a row's children produce — counted over the
 * children the run KEPT, not the ones it was offered.
 *
 * `kept` is the row's own child answer: the MCP files, or the LSP editors, the
 * wizard narrowed to. Counting the plan's children instead recapped `2 added`
 * for a run the user had just narrowed to one file, so the plan and the result
 * described different work. Absent (`undefined`) means the narrowing prompt was
 * never answered, which is the same thing the compose bodies read as "all".
 *
 * @param row - The plan row.
 * @param kept - The child keys the run retained, or `undefined` for all.
 * @returns The counts note, or `undefined` when the row has no children.
 */
function childNote(
  row: PlanRow,
  kept: readonly string[] | undefined,
): string | undefined {
  const children = (row.children ?? []).filter(
    (child) => kept === undefined || kept.includes(child.key),
  );
  if (children.length === 0) return undefined;
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
 * @param scope - The resolved scope selection.
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
  // A target is worth narrowing only when it has more than one child to choose
  // between. `mcp` offers its config files; `lsp` offers the editors on PATH —
  // a machine with several VS Code forks should not have the extension pushed
  // into all of them just because they are installed.
  const narrowable = (
    [
      ["mcp", "Configure MCP for which files?"],
      ["lsp", "Install the extension into which editors?"],
    ] as const
  ).filter(([target]) => !removal && childrenOf(plan, target).length > 1);

  for (const [target, message] of narrowable) {
    // Asked whenever the row it narrows is in the run — one direct question,
    // no meta-question in front of it. Removing a prompt cannot break the
    // non-interactive paths: `autoPrompt`/`mcpPrompt` return each question's
    // default, so a smaller prompt list means a smaller answer bag, and the
    // compose bodies already read an absent child answer as "all". (The
    // asymmetry is the reason this direction is safe: ADDING a defaultless
    // prompt would hard-fail with MISSING_REQUIRED_ANSWER.)
    const rowChosen = (answers: Record<string, unknown>): boolean => {
      const chosen = readList(answers, ROWS_ANSWER);
      return plan.rows.some(
        (row) => row.target === target && isChosen(row, chosen),
      );
    };
    prompts.push(buildChildPrompt(plan, target, message, rowChosen));
  }

  /** The detection behind a row, for composing and for re-reading its draft. */
  const detectionFor = (row: PlanRow): DetectedRow | undefined =>
    detected.find((d) => d.target.id === row.target && d.scope === row.scope);

  const generator: GeneratorDefinition = {
    meta: buildMeta(
      rt,
      mode === "all" ? `${BIN_NAME} setup` : `${BIN_NAME} setup ${mode}`,
    ),
    prompts,
    generate: (answers) => {
      const chosen = readList(answers, ROWS_ANSWER);
      const tasks = plan.rows.flatMap((row) => {
        if (!isChosen(row, chosen)) return [];
        const hit = detectionFor(row);
        if (hit === undefined) return [];
        // Each target reads ITS OWN child answer. One shared list was handing
        // MCP file paths to every other target's compose.
        const key = CHILD_ANSWER[row.target];
        const children = key === undefined ? undefined : readList(answers, key);
        const task = removal
          ? hit.target.composeRemoval(hit.detection)
          : hit.target.compose(hit.detection, children);
        return [{ key: rowKey(row.scope, row.target), task }];
      });
      return runRowsIsolated(sink, tasks);
    },
  };

  /** The outcome one row ended in, read off the sink and its own draft. */
  const outcomeFor = (
    row: PlanRow,
    chosen: readonly string[] | undefined,
    answers: Record<string, unknown>,
  ): PlanOutcome | undefined => {
    const hit = detectionFor(row);
    // A row whose DETECTION threw has no draft to read and nothing to compose,
    // and it is not a skip: the target was requested and did not happen. It
    // reports `failed` with its own cause, exactly as a failed compose does, so
    // the run names it instead of reporting a clean sweep over its siblings.
    const failure = hit === undefined ? undefined : detectionFailure(hit);
    if (failure !== undefined) return { status: "failed", note: failure };
    const draft = hit === undefined ? undefined : draftFor(hit, roots, removal);
    if (row.action === "skip") {
      return {
        status: "skipped",
        ...(draft?.remedy === undefined ? {} : { remedy: draft.remedy }),
      };
    }
    // An already-current row reports `noop` whether or not it was selected. It
    // is offered DE-selected (there is nothing to do to it), and returning no
    // outcome at all left a converged re-run with a plan-shaped output that
    // claimed nothing had run — while the row still rendered a bare green ✓.
    // Convergence is a real result: one quiet line per row, zero writes.
    if (row.action === "none") return { status: "noop", note: "unchanged" };
    if (!isChosen(row, chosen)) return undefined;
    const error = sink.get(rowKey(row.scope, row.target));
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
    // A removal never borrows the forward child summary: its children are the
    // files the entry is being taken OUT of, and counting them as "1 updated"
    // described the opposite of what the run had just done.
    const childKey = CHILD_ANSWER[row.target];
    const kept =
      childKey === undefined ? undefined : readList(answers, childKey);
    const note = removal
      ? ACTION_NOTES[row.action]
      : (childNote(row, kept) ?? ACTION_NOTES[row.action]);
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
          const outcome = outcomeFor(row, chosen, answers);
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
