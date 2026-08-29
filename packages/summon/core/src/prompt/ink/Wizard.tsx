/**
 * The root Ink view — a pure projection of {@link SessionController} state.
 * Under `prompt/ink/**` — dynamic-only. Ported from the summon wizard's App,
 * but it OWNS no execution: the seam runs the task; this view only renders the
 * prompt sequence, the preview/confirm gate, live progress, and the outcome.
 */

import { describeEffect, type Effect } from "@canonical/task";
import { Box, Static, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import {
  COMPLETED_GLYPH,
  describedWidthBudget,
  FAILURE_GLYPH,
  formatEffectDuration,
  truncateMiddle,
} from "./progressWindow.js";
import { AnswersTable, ProgressHeader, QuestionView } from "./prompts.js";
import { Spinner } from "./Spinner.js";
import type {
  SessionController,
  StepProgress,
  WizardState,
} from "./session.js";

/** A compact summary of the effects the confirm gate is about to apply. */
const EffectsSummary = ({ effects }: { effects: readonly Effect[] }) => {
  const files = new Set<string>();
  const dirs = new Set<string>();
  const links = new Set<string>();
  let commands = 0;
  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
      case "AppendFile":
        files.add(effect.path);
        break;
      case "MakeDir":
        dirs.add(effect.path);
        break;
      case "Symlink":
        links.add(effect.path);
        break;
      case "Exec":
        commands++;
        break;
    }
  }
  const rows: Array<{ label: string; count: number }> = [];
  if (files.size > 0)
    rows.push({
      label: `File${files.size > 1 ? "s" : ""} to create`,
      count: files.size,
    });
  if (dirs.size > 0)
    rows.push({
      label: `Director${dirs.size > 1 ? "ies" : "y"} to create`,
      count: dirs.size,
    });
  if (links.size > 0)
    rows.push({
      label: `Symlink${links.size > 1 ? "s" : ""} to create`,
      count: links.size,
    });
  if (commands > 0)
    rows.push({
      label: `Command${commands > 1 ? "s" : ""} to run`,
      count: commands,
    });

  if (rows.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text dimColor>No operations planned.</Text>
      </Box>
    );
  }
  const width = Math.max(...rows.map((r) => r.label.length));
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold dimColor>
        Operations:
      </Text>
      {rows.map((row) => (
        <Box key={row.label}>
          <Text dimColor> {row.label.padEnd(width)} </Text>
          <Text color="green">{row.count}</Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Live progress: the file effects completed so far, each with what it cost.
 *
 * The completed lines render under Ink's `<Static>` (C7): each is printed ONCE,
 * to the scrollback above the live region, instead of the whole history being
 * re-rendered on every new effect — the flicker/scroll a big scaffold otherwise
 * caused. Each line is middle-truncated so a long path stays on ONE row. Only
 * the trailing spinner remains in the live (re-rendered) frame.
 *
 * The trailing `(12ms)` is the duration the seam already delivers per effect
 * (`SessionController.reportEffectComplete`) — same spelling as the summon
 * binary's timed view. The description is truncated against a budget that has
 * everything rendered around it — the `✓ ` prefix as well as the suffix —
 * reserved out of it ({@link describedWidthBudget}), so neither the glyph nor
 * the timing can push the row past the one-line cap.
 */
/**
 * Live progress in the HOST's units — rendered whenever the host has reported
 * steps ({@link SessionController.reportStep}), in place of the per-effect
 * transcript below. One row per step: a settled row wears the shared outcome
 * glyph and its wall time, the running one a spinner. The glyphs, the duration
 * spelling and the one-row truncation are the transcript's own — the two views
 * share one dialect; they differ only in what a row IS.
 *
 * Rendered in the LIVE region, never under `<Static>`, and that is
 * load-bearing: `execute` walks `generate` on the mock interpreter once after
 * consent (the outcome summary's file list), so the board fills with
 * near-zero-duration rows once before the real drive resets and repaints it
 * (see {@link SessionController.reportStep}) — and a static row cannot be
 * taken back. The list is bounded by the host's own step count (one row per
 * setup target), so the full-repaint cost `<Static>` exists to avoid does not
 * arise.
 */
const StepRow = ({ step }: { step: StepProgress }) => {
  if (step.status === "running") {
    return (
      <Box>
        <Spinner
          color="blue"
          label={truncateMiddle(step.label, describedWidthBudget(""))}
        />
      </Box>
    );
  }
  const duration = formatEffectDuration(step.duration ?? 0);
  return (
    <Text>
      {step.status === "failed" ? (
        <Text color="red">{FAILURE_GLYPH}</Text>
      ) : (
        <Text color="green">{COMPLETED_GLYPH}</Text>
      )}{" "}
      {truncateMiddle(step.label, describedWidthBudget(duration))}{" "}
      <Text dimColor>{duration}</Text>
    </Text>
  );
};

const StepsProgress = ({ state }: { state: WizardState }) => (
  <Box flexDirection="column">
    {state.steps.map((step) => (
      <StepRow key={step.key} step={step} />
    ))}
  </Box>
);

const Progress = ({ state }: { state: WizardState }) => {
  const shown = state.progress.filter(
    (t) =>
      t.effect._tag !== "Log" &&
      t.effect._tag !== "Exists" &&
      t.effect._tag !== "ReadFile" &&
      t.effect._tag !== "ReadContext" &&
      t.effect._tag !== "WriteContext" &&
      t.effect._tag !== "Prompt" &&
      t.effect._tag !== "Parallel" &&
      t.effect._tag !== "Race",
  );
  return (
    <Box flexDirection="column">
      <Static items={shown}>
        {(t, i) => {
          const duration = formatEffectDuration(t.duration);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only progress; a path may repeat
            <Text key={`${t.effect._tag}-${i}`}>
              <Text color="green">{COMPLETED_GLYPH}</Text>{" "}
              {truncateMiddle(
                describeEffect(t.effect),
                describedWidthBudget(duration),
              )}{" "}
              <Text dimColor>{duration}</Text>
            </Text>
          );
        }}
      </Static>
      {state.phase === "executing" && (
        <Box>
          <Spinner color="blue" label="Generating…" />
        </Box>
      )}
    </Box>
  );
};

export interface WizardProps {
  /** The controller this view projects and drives. */
  controller: SessionController;
}

/** The wizard view — subscribes to the controller and renders its phase. */
export const Wizard = ({ controller }: WizardProps) => {
  const [state, setState] = useState<WizardState>(controller.getSnapshot());

  useEffect(
    () => controller.subscribe(() => setState(controller.getSnapshot())),
    [controller],
  );

  // Ctrl-C cancels from any phase (Ink is mounted with exitOnCtrlC:false, so the
  // key reaches here). Cancelling rejects the pending prompt, failing the task.
  // Ctrl-D is EOF (C3): input has ENDED, so a pending prompt resolves to a
  // usage error naming the unanswered question rather than hanging (and, with
  // nothing pending, aborts like a cancel) — see SessionController.eof.
  useInput((input, key) => {
    if (key.ctrl && input === "c") controller.cancel();
    else if (key.ctrl && input === "d") controller.eof();
  });

  useInput(
    (input, key) => {
      if (state.phase !== "confirming") return;
      if (key.return || input.toLowerCase() === "y")
        controller.submitConfirm(true);
      else if (input.toLowerCase() === "n" || key.escape)
        controller.submitConfirm(false);
    },
    { isActive: state.phase === "confirming" },
  );

  const { generator } = state;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {generator.meta.name}
        </Text>
        <Text dimColor> v{generator.meta.version}</Text>
      </Box>

      {state.phase === "idle" && <Spinner label="Loading…" />}

      {state.phase === "prompting" && state.activeQuestion && (
        <Box flexDirection="column">
          <ProgressHeader current={state.step} total={state.total} />
          <AnswersTable prompts={generator.prompts} answers={state.answers} />
          {/*
            KEYED BY QUESTION NAME, and it is load-bearing. Every question
            widget seeds its state from `question.default` with `useState`,
            which runs on MOUNT only. Without a key React reuses one instance
            across consecutive questions of the same type, so the second one
            inherits the first one's state instead of its own default — two
            adjacent multiselects, and the answers cross.

            That is not hypothetical: `pragma setup` asks "which targets" and
            then "configure MCP for which files", and it shipped a run where the
            second answered with the FIRST's row ids
            (`Invalid --mcp-targets "global:completions"`). It was invisible for
            as long as a confirm sat between the two — a different widget type
            forces a remount — so removing that confirm did not cause the bug,
            it stopped hiding it.
          */}
          <QuestionView
            key={state.activeQuestion.question.name}
            question={state.activeQuestion.question}
            validate={
              generator.prompts.find(
                (p) => p.name === state.activeQuestion?.question.name,
              )?.validate
            }
            onSubmit={(value) => controller.submitAnswer(value)}
            onCancel={() => controller.cancel()}
          />
        </Box>
      )}

      {state.phase === "confirming" && (
        <Box flexDirection="column">
          <AnswersTable prompts={generator.prompts} answers={state.answers} />
          <EffectsSummary effects={state.previewEffects} />
          <Box>
            <Text color="magenta">› </Text>
            <Text bold>Proceed? </Text>
            <Text dimColor>(Y/n)</Text>
          </Box>
        </Box>
      )}

      {(state.phase === "executing" || state.phase === "complete") &&
        (state.steps.length > 0 ? (
          <StepsProgress state={state} />
        ) : (
          <Progress state={state} />
        ))}

      {/*
        The banner belongs to the DEFAULT transcript only. A host that narrates
        its run in its own steps also owns its own epilogue (pragma's `setup`
        prints its recap right after the unmount), and "Generation complete!"
        over a run that is not a generation was exactly the vocabulary leak the
        step rows exist to close.
      */}
      {state.phase === "complete" && state.steps.length === 0 && (
        <Box marginTop={1}>
          <Text color="green">{COMPLETED_GLYPH} Generation complete!</Text>
        </Box>
      )}

      {state.phase === "cancelled" &&
        (() => {
          // Truthful (H2): a Ctrl-C mid-execution may have written some files
          // before the abort landed, so count the completed write-like effects
          // the session already tracked rather than always claiming none.
          const written = state.progress.filter((t) =>
            ["WriteFile", "AppendFile", "Symlink", "CopyFile"].includes(
              t.effect._tag,
            ),
          ).length;
          return (
            <Text color="yellow">
              {FAILURE_GLYPH} Cancelled.{" "}
              {written === 0
                ? "No files were written."
                : `${written} file(s) were written.`}
            </Text>
          );
        })()}

      {state.phase === "error" && (
        <Text color="red">
          {FAILURE_GLYPH} Error: {state.error?.message}
        </Text>
      )}
    </Box>
  );
};
