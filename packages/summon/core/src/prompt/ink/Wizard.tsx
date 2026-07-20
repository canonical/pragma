/**
 * The root Ink view — a pure projection of {@link SessionController} state.
 * Under `prompt/ink/**` — dynamic-only. Ported from the summon wizard's App,
 * but it OWNS no execution: the seam runs the task; this view only renders the
 * prompt sequence, the preview/confirm gate, live progress, and the outcome.
 */

import { describeEffect, type Effect } from "@canonical/task";
import { Box, Static, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { truncateMiddle } from "./progressWindow.js";
import { AnswersTable, ProgressHeader, QuestionView } from "./prompts.js";
import { Spinner } from "./Spinner.js";
import type { SessionController, WizardState } from "./session.js";

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
 * Live progress: the file effects completed so far.
 *
 * The completed lines render under Ink's `<Static>` (C7): each is printed ONCE,
 * to the scrollback above the live region, instead of the whole history being
 * re-rendered on every new effect — the flicker/scroll a big scaffold otherwise
 * caused. Each line is middle-truncated so a long path stays on ONE row. Only
 * the trailing spinner remains in the live (re-rendered) frame.
 */
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
        {(t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only progress; a path may repeat
          <Text key={`${t.effect._tag}-${i}`}>
            <Text color="green">✓</Text>{" "}
            {truncateMiddle(describeEffect(t.effect))}
          </Text>
        )}
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
  useInput((input, key) => {
    if (key.ctrl && input === "c") controller.cancel();
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
          <QuestionView
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

      {(state.phase === "executing" || state.phase === "complete") && (
        <Progress state={state} />
      )}

      {state.phase === "complete" && (
        <Box marginTop={1}>
          <Text color="green">✓ Generation complete!</Text>
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
              ✗ Cancelled.{" "}
              {written === 0
                ? "No files were written."
                : `${written} file(s) were written.`}
            </Text>
          );
        })()}

      {state.phase === "error" && (
        <Text color="red">✗ Error: {state.error?.message}</Text>
      )}
    </Box>
  );
};
