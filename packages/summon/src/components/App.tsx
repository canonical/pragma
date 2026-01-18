/**
 * App Component
 *
 * Main CLI application component using React Ink.
 */

import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { dryRun } from "../dry-run.js";
import type { Effect, GeneratorDefinition, Task, TaskError } from "../types.js";
import { ExecutionProgress } from "./ExecutionProgress.js";
import { FileTreePreview } from "./FileTreePreview.js";
import { PromptSequence } from "./PromptSequence.js";
import { Spinner } from "./Spinner.js";

/**
 * Summarize effects into a human-readable string.
 * Deduplicates paths to avoid counting the same directory multiple times.
 */
const summarizeEffects = (effects: Effect[]): string => {
  const files = new Set<string>();
  const directories = new Set<string>();
  const copied = new Set<string>();
  const deleted = new Set<string>();
  let commands = 0;

  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
        files.add(effect.path);
        break;
      case "MakeDir":
        directories.add(effect.path);
        break;
      case "CopyFile":
        copied.add(effect.dest);
        break;
      case "DeleteFile":
      case "DeleteDirectory":
        deleted.add(effect.path);
        break;
      case "Exec":
        commands++;
        break;
      // Log effects are not counted in summary
    }
  }

  const parts: string[] = [];

  if (files.size > 0) {
    parts.push(`${files.size} file${files.size > 1 ? "s" : ""}`);
  }
  if (directories.size > 0) {
    parts.push(
      `${directories.size} director${directories.size > 1 ? "ies" : "y"}`,
    );
  }
  if (copied.size > 0) {
    parts.push(`${copied.size} copied`);
  }
  if (deleted.size > 0) {
    parts.push(`${deleted.size} deleted`);
  }
  if (commands > 0) {
    parts.push(`${commands} command${commands > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return "No changes made";
  }

  return `Created ${parts.join(", ")}`;
};

export type AppState =
  | { phase: "loading" }
  | { phase: "prompting" }
  | { phase: "preview"; effects: Effect[] }
  | { phase: "confirming"; effects: Effect[] }
  | { phase: "executing"; task: Task<void> }
  | { phase: "complete"; effects: Effect[]; duration: number }
  | { phase: "error"; error: TaskError };

export interface AppProps {
  /** The generator to run */
  generator: GeneratorDefinition;
  /** Whether to show a preview before executing */
  preview?: boolean;
  /** Whether to run in dry-run mode only */
  dryRunOnly?: boolean;
  /** Pre-filled answers (for non-interactive mode) */
  answers?: Record<string, unknown>;
}

export const App = ({
  generator,
  preview = true,
  dryRunOnly = false,
  answers: prefilledAnswers,
}: AppProps) => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(
    prefilledAnswers ? { phase: "loading" } : { phase: "prompting" },
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    prefilledAnswers ?? {},
  );

  const handlePromptsComplete = useCallback(
    (promptAnswers: Record<string, unknown>) => {
      setAnswers(promptAnswers);

      // Generate the task
      const task = generator.generate(promptAnswers);

      if (dryRunOnly || preview) {
        // Run dry-run to collect effects
        try {
          const result = dryRun(task);
          if (dryRunOnly) {
            setState({ phase: "preview", effects: result.effects });
          } else {
            setState({ phase: "confirming", effects: result.effects });
          }
        } catch (err) {
          setState({
            phase: "error",
            error:
              err instanceof Error
                ? { code: "DRY_RUN_ERROR", message: err.message }
                : { code: "UNKNOWN_ERROR", message: String(err) },
          });
        }
      } else {
        setState({ phase: "executing", task });
      }
    },
    [generator, preview, dryRunOnly],
  );

  const handleConfirm = useCallback(() => {
    const task = generator.generate(answers);
    setState({ phase: "executing", task });
  }, [generator, answers]);

  const handleCancel = useCallback(() => {
    exit();
  }, [exit]);

  const handleExecutionComplete = useCallback(
    (effects: Effect[], duration: number) => {
      setState({ phase: "complete", effects, duration });
    },
    [],
  );

  const handleExecutionError = useCallback((error: TaskError) => {
    setState({ phase: "error", error });
  }, []);

  // Handle pre-filled answers
  useEffect(() => {
    if (prefilledAnswers && state.phase === "loading") {
      handlePromptsComplete(prefilledAnswers);
    }
  }, [prefilledAnswers, state.phase, handlePromptsComplete]);

  // Handle confirm/cancel input when in confirming state
  useInput(
    (input) => {
      if (state.phase === "confirming") {
        if (input.toLowerCase() === "y") {
          handleConfirm();
        } else if (input.toLowerCase() === "n") {
          handleCancel();
        }
      }
    },
    { isActive: state.phase === "confirming" },
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {generator.meta.name}
        </Text>
        <Text dimColor> v{generator.meta.version}</Text>
      </Box>
      <Text dimColor>{generator.meta.description}</Text>
      <Box marginBottom={1} />

      {/* Content based on state */}
      {state.phase === "loading" && <Spinner label="Loading..." />}

      {state.phase === "prompting" && (
        <PromptSequence
          prompts={generator.prompts}
          onComplete={handlePromptsComplete}
          onCancel={handleCancel}
        />
      )}

      {state.phase === "preview" && (
        <Box flexDirection="column">
          <FileTreePreview effects={state.effects} />
          <Box marginTop={1}>
            <Text dimColor>Dry-run complete. No files were modified.</Text>
          </Box>
        </Box>
      )}

      {state.phase === "confirming" && (
        <Box flexDirection="column">
          <FileTreePreview effects={state.effects} />
          <Box marginTop={1}>
            <Text>Proceed with these changes? (y/n)</Text>
          </Box>
        </Box>
      )}

      {state.phase === "executing" && (
        <ExecutionProgress
          task={state.task}
          onComplete={handleExecutionComplete}
          onError={handleExecutionError}
        />
      )}

      {state.phase === "complete" && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">✓ Generation complete!</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              {summarizeEffects(state.effects)} in {state.duration.toFixed(0)}ms
            </Text>
          </Box>
        </Box>
      )}

      {state.phase === "error" && (
        <Box flexDirection="column">
          <Box>
            <Text color="red">✗ Error: {state.error.message}</Text>
          </Box>
          {state.error.code && (
            <Box marginTop={1}>
              <Text dimColor>Code: {state.error.code}</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
