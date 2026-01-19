/**
 * App Component
 *
 * Main CLI application component using React Ink.
 */

import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { dryRun } from "../dry-run.js";
import type {
  Effect,
  GeneratorDefinition,
  PromptDefinition,
  Task,
  TaskError,
} from "../types.js";
import { ExecutionProgress, type TimedEffect } from "./ExecutionProgress.js";
import { PromptSequence } from "./PromptSequence.js";
import { Spinner } from "./Spinner.js";

// =============================================================================
// Effect Tree - Hierarchical display with action labels and tree connectors
// =============================================================================

interface GroupedEffects {
  files: Effect[];
  directories: Effect[];
  commands: Effect[];
  logs: Effect[];
}

/**
 * Group effects by category for display.
 */
const groupEffects = (effects: Effect[]): GroupedEffects => {
  const groups: GroupedEffects = {
    files: [],
    directories: [],
    commands: [],
    logs: [],
  };

  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
      case "AppendFile":
      case "CopyFile":
      case "CopyDirectory":
      case "DeleteFile":
        groups.files.push(effect);
        break;
      case "MakeDir":
      case "DeleteDirectory":
        groups.directories.push(effect);
        break;
      case "Exec":
        groups.commands.push(effect);
        break;
      case "Log":
        // Filter out debug logs
        if (effect.level !== "debug") {
          groups.logs.push(effect);
        }
        break;
      // Ignore internal effects: ReadFile, Exists, Glob, ReadContext, WriteContext, Parallel, Race
    }
  }

  return groups;
};

/**
 * Get human-readable action label for an effect.
 */
const getActionLabel = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return "Created file";
    case "AppendFile":
      return "Appended to";
    case "MakeDir":
      return "Created dir";
    case "CopyFile":
      return "Copied file";
    case "CopyDirectory":
      return "Copied dir";
    case "DeleteFile":
      return "Deleted file";
    case "DeleteDirectory":
      return "Deleted dir";
    case "Exec":
      return "Executed";
    case "Log":
      switch (effect.level) {
        case "info":
          return "Info";
        case "warn":
          return "Warning";
        case "error":
          return "Error";
        default:
          return "Log";
      }
    default:
      return effect._tag;
  }
};

/**
 * Get color for action label based on effect type.
 */
const getActionColor = (
  effect: Effect,
): "green" | "red" | "yellow" | "cyan" | "blue" | "magenta" | undefined => {
  switch (effect._tag) {
    case "WriteFile":
    case "MakeDir":
      return "green";
    case "AppendFile":
      return "magenta";
    case "DeleteFile":
    case "DeleteDirectory":
      return "red";
    case "CopyFile":
    case "CopyDirectory":
      return "cyan";
    case "Exec":
      return "yellow";
    case "Log":
      return effect.level === "error"
        ? "red"
        : effect.level === "warn"
          ? "yellow"
          : "blue";
    default:
      return undefined;
  }
};

/**
 * Get the payload (description) for an effect.
 */
const getEffectPayload = (effect: Effect): string => {
  switch (effect._tag) {
    case "WriteFile":
      return effect.path;
    case "AppendFile":
      return effect.path;
    case "MakeDir":
      return effect.path;
    case "CopyFile":
      return `${effect.source} → ${effect.dest}`;
    case "CopyDirectory":
      return `${effect.source}/ → ${effect.dest}/`;
    case "DeleteFile":
    case "DeleteDirectory":
      return effect.path;
    case "Exec":
      return `${effect.command} ${effect.args.join(" ")}`;
    case "Log":
      return effect.message;
    default:
      return effect._tag;
  }
};

// Fixed width for action label column (padded to align payloads)
const ACTION_LABEL_WIDTH = 14;

/**
 * Render a single effect as a tree row with action label and payload.
 */
const EffectTreeRow = ({
  effect,
  isLast,
}: {
  effect: Effect;
  isLast: boolean;
}) => {
  const connector = isLast ? "└─" : "├─";
  const actionLabel = getActionLabel(effect);
  const color = getActionColor(effect);
  const payload = getEffectPayload(effect);

  return (
    <Box>
      <Text dimColor>{connector} </Text>
      <Text color={color}>{actionLabel.padEnd(ACTION_LABEL_WIDTH)}</Text>
      <Text>{payload}</Text>
    </Box>
  );
};

/**
 * Render a section of the effect tree (e.g., Files, Directories).
 */
const EffectTreeSection = ({
  title,
  effects,
}: {
  title: string;
  effects: Effect[];
}) => {
  if (effects.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>
        {title}:
      </Text>
      <Box flexDirection="column" marginLeft={1}>
        {effects.map((effect, index) => (
          <EffectTreeRow
            key={`${effect._tag}-${index}`}
            effect={effect}
            isLast={index === effects.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

/**
 * Render a tree view of completed effects, grouped by category.
 */
const _EffectTree = ({ effects }: { effects: Effect[] }) => {
  const groups = groupEffects(effects);
  const hasAnyEffects =
    groups.files.length > 0 ||
    groups.directories.length > 0 ||
    groups.commands.length > 0 ||
    groups.logs.length > 0;

  if (!hasAnyEffects) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <EffectTreeSection title="Files" effects={groups.files} />
      <EffectTreeSection title="Directories" effects={groups.directories} />
      <EffectTreeSection title="Commands" effects={groups.commands} />
      <EffectTreeSection title="Logs" effects={groups.logs} />
    </Box>
  );
};

// =============================================================================
// Effect Timeline - Chronological display with timestamps
// =============================================================================

// Width for timestamp column (e.g., "+123ms")
const TIMESTAMP_WIDTH = 8;

/**
 * Filter effects to only show user-relevant ones (not internal effects).
 */
const isVisibleEffect = (effect: Effect): boolean => {
  switch (effect._tag) {
    case "WriteFile":
    case "AppendFile":
    case "MakeDir":
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "Exec":
      return true;
    case "Log":
      // Filter out debug logs
      return effect.level !== "debug";
    // Internal effects are not shown
    case "ReadFile":
    case "Exists":
    case "Glob":
    case "ReadContext":
    case "WriteContext":
    case "Prompt":
    case "Parallel":
    case "Race":
      return false;
    default:
      return false;
  }
};

/**
 * Render a single timeline row with timestamp, action, and payload.
 */
const TimelineRow = ({
  effect,
  timestamp,
  showTimestamp,
  isLast,
}: {
  effect: Effect;
  timestamp: number;
  showTimestamp: boolean;
  isLast: boolean;
}) => {
  const connector = isLast ? "└─" : "├─";
  const actionLabel = getActionLabel(effect);
  const color = getActionColor(effect);
  const payload = getEffectPayload(effect);
  const timestampStr = showTimestamp
    ? `+${Math.round(timestamp)}ms`.padEnd(TIMESTAMP_WIDTH)
    : " ".repeat(TIMESTAMP_WIDTH);

  return (
    <Box>
      <Text dimColor>{timestampStr}</Text>
      <Text dimColor>{connector} </Text>
      <Text color={color}>{actionLabel.padEnd(ACTION_LABEL_WIDTH)}</Text>
      <Text>{payload}</Text>
    </Box>
  );
};

/**
 * Render effects in chronological order with timestamps.
 * Timestamps are only shown when they differ from the previous effect.
 * Duplicate MakeDir effects (same path) are deduplicated.
 */
const EffectTimeline = ({ effects }: { effects: TimedEffect[] }) => {
  // Filter to visible effects only and deduplicate MakeDir by path
  const seenDirPaths = new Set<string>();
  const visibleEffects = effects.filter((e) => {
    if (!isVisibleEffect(e.effect)) return false;
    // Deduplicate MakeDir by path (keep only first occurrence)
    if (e.effect._tag === "MakeDir") {
      if (seenDirPaths.has(e.effect.path)) return false;
      seenDirPaths.add(e.effect.path);
    }
    return true;
  });

  if (visibleEffects.length === 0) {
    return null;
  }

  // Track which timestamps to show (only when different from previous)
  let lastShownTimestamp = -1;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>
        Timeline:
      </Text>
      <Box flexDirection="column" marginLeft={1}>
        {visibleEffects.map((item, index) => {
          const roundedTimestamp = Math.round(item.timestamp);
          const showTimestamp = roundedTimestamp !== lastShownTimestamp;
          if (showTimestamp) {
            lastShownTimestamp = roundedTimestamp;
          }
          // Effects are append-only, index is stable
          const key = `${item.timestamp}-${item.effect._tag}-${index}`;
          return (
            <TimelineRow
              key={key}
              effect={item.effect}
              timestamp={item.timestamp}
              showTimestamp={showTimestamp}
              isLast={index === visibleEffects.length - 1}
            />
          );
        })}
      </Box>
    </Box>
  );
};

// =============================================================================
// Dry-Run Timeline - Preview without timestamps
// =============================================================================

/**
 * Render a single dry-run row (no timestamp column).
 */
const DryRunRow = ({ effect, isLast }: { effect: Effect; isLast: boolean }) => {
  const connector = isLast ? "└─" : "├─";
  const actionLabel = getActionLabel(effect);
  const color = getActionColor(effect);
  const payload = getEffectPayload(effect);

  return (
    <Box>
      <Text dimColor>{connector} </Text>
      <Text color={color}>{actionLabel.padEnd(ACTION_LABEL_WIDTH)}</Text>
      <Text>{payload}</Text>
    </Box>
  );
};

/**
 * Render effects as a preview timeline (dry-run mode).
 * Shows the same format as execution timeline but without timestamps.
 */
const DryRunTimeline = ({
  effects,
  title = "Plan:",
}: {
  effects: Effect[];
  title?: string;
}) => {
  // Filter to visible effects only and deduplicate MakeDir by path
  const seenDirPaths = new Set<string>();
  const visibleEffects = effects.filter((e) => {
    if (!isVisibleEffect(e)) return false;
    // Deduplicate MakeDir by path (keep only first occurrence)
    if (e._tag === "MakeDir") {
      if (seenDirPaths.has(e.path)) return false;
      seenDirPaths.add(e.path);
    }
    return true;
  });

  if (visibleEffects.length === 0) {
    return (
      <Box>
        <Text dimColor>No operations planned.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold dimColor>
        {title}
      </Text>
      <Box flexDirection="column" marginLeft={1}>
        {visibleEffects.map((effect, index) => {
          const key = `${effect._tag}-${index}`;
          return (
            <DryRunRow
              key={key}
              effect={effect}
              isLast={index === visibleEffects.length - 1}
            />
          );
        })}
      </Box>
    </Box>
  );
};

// =============================================================================
// Completed Answers Display (for confirmation phase)
// =============================================================================

/**
 * Format answer value for display based on prompt type.
 */
const formatAnswerValue = (
  value: unknown,
  prompt: PromptDefinition,
): string => {
  if (value === undefined || value === null) return "";

  if (prompt.type === "confirm") {
    return value ? "Yes" : "No";
  }

  if (prompt.type === "select" && prompt.choices) {
    const choice = prompt.choices.find((c) => c.value === value);
    return choice?.label ?? String(value);
  }

  if (prompt.type === "multiselect" && Array.isArray(value)) {
    if (value.length === 0) return "None";
    if (prompt.choices) {
      return value
        .map((v) => prompt.choices?.find((c) => c.value === v)?.label ?? v)
        .join(", ");
    }
    return value.join(", ");
  }

  return String(value);
};

/**
 * Display a single completed answer.
 */
const CompletedAnswerRow = ({
  prompt,
  value,
}: {
  prompt: PromptDefinition;
  value: unknown;
}) => {
  const displayValue = formatAnswerValue(value, prompt);

  return (
    <Box>
      <Text color="green">✔ </Text>
      <Text dimColor>{prompt.message} </Text>
      <Text color="cyan">{displayValue}</Text>
    </Box>
  );
};

/**
 * Display all completed answers for confirmation review.
 */
const CompletedAnswers = ({
  prompts,
  answers,
}: {
  prompts: PromptDefinition[];
  answers: Record<string, unknown>;
}) => {
  // Filter to only show prompts that have answers and pass their `when` condition
  const activePrompts = prompts.filter((prompt) => {
    if (prompt.when && !prompt.when(answers)) {
      return false;
    }
    return prompt.name in answers;
  });

  if (activePrompts.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {activePrompts.map((prompt) => (
        <CompletedAnswerRow
          key={prompt.name}
          prompt={prompt}
          value={answers[prompt.name]}
        />
      ))}
    </Box>
  );
};

/**
 * Summarize effects for the confirmation message (just counts).
 */
const summarizeEffectsForConfirm = (effects: Effect[]): string => {
  const files = new Set<string>();
  const directories = new Set<string>();
  let commands = 0;

  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
        files.add(effect.path);
        break;
      case "MakeDir":
        directories.add(effect.path);
        break;
      case "Exec":
        commands++;
        break;
    }
  }

  const parts: string[] = [];
  if (files.size > 0)
    parts.push(`${files.size} file${files.size > 1 ? "s" : ""}`);
  if (directories.size > 0)
    parts.push(
      `${directories.size} director${directories.size > 1 ? "ies" : "y"}`,
    );
  if (commands > 0)
    parts.push(`run ${commands} command${commands > 1 ? "s" : ""}`);

  return parts.length > 0 ? `create ${parts.join(", ")}` : "make no changes";
};

/**
 * Summarize effects into a human-readable string.
 * Deduplicates paths to avoid counting the same directory multiple times.
 */
const summarizeEffects = (effects: TimedEffect[]): string => {
  const files = new Set<string>();
  const directories = new Set<string>();
  const copied = new Set<string>();
  const deleted = new Set<string>();
  let commands = 0;

  for (const { effect } of effects) {
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
  | {
      phase: "confirming";
      effects: Effect[];
      promptAnswers: Record<string, unknown>;
    }
  | { phase: "executing"; task: Task<void> }
  | { phase: "complete"; effects: TimedEffect[]; duration: number }
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
            setState({
              phase: "confirming",
              effects: result.effects,
              promptAnswers,
            });
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
    (effects: TimedEffect[], duration: number) => {
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

  // Handle going back from confirmation to prompting
  const handleGoBack = useCallback(() => {
    setState({ phase: "prompting" });
  }, []);

  // Handle confirm/cancel/back input when in confirming state
  useInput(
    (input, key) => {
      if (state.phase === "confirming") {
        if (key.escape) {
          handleGoBack();
        } else if (key.return || input.toLowerCase() === "y") {
          // Enter or Y confirms
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
          initialAnswers={answers}
        />
      )}

      {state.phase === "preview" && (
        <Box flexDirection="column">
          <DryRunTimeline effects={state.effects} title="Plan (dry-run):" />
          <Box marginTop={1}>
            <Text dimColor>Dry-run complete. No files were modified.</Text>
          </Box>
        </Box>
      )}

      {state.phase === "confirming" && (
        <Box flexDirection="column">
          {/* Show completed answers */}
          <CompletedAnswers
            prompts={generator.prompts}
            answers={state.promptAnswers}
          />
          {/* Confirmation prompt with escape hint */}
          <Box>
            <Text color="magenta">› </Text>
            <Text>This will {summarizeEffectsForConfirm(state.effects)}. </Text>
            <Text bold>Proceed? </Text>
            <Text dimColor>(Y/n) </Text>
            <Text dimColor italic>
              esc to go back
            </Text>
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
          <EffectTimeline effects={state.effects} />
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
