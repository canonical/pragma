/**
 * App Component
 *
 * Main CLI application component using React Ink.
 */

import {
  formatContentPreview,
  GENERATOR_INVALID_ANSWER,
  type GeneratorDefinition,
  isInvalidAnswersError,
  type PromptDefinition,
  type StampConfig,
} from "@canonical/summon-core";
import {
  collectUndos,
  dryRun,
  type Effect,
  type Task,
  type TaskError,
} from "@canonical/task";
import { hostExistsResolver, runCollectedUndos } from "@canonical/task/node";
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { ExecutionProgress, type TimedEffect } from "./ExecutionProgress.js";
import { PromptSequence } from "./PromptSequence.js";
import { Spinner } from "./Spinner.js";
import {
  describeUndoSteps,
  isUnreversibleExec,
  shouldSkipUndoGate,
} from "./undoPlan.js";

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
 * @param effects - The effects to group
 * @param verbose - If true, include debug logs
 */
const groupEffects = (effects: Effect[], verbose = false): GroupedEffects => {
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
        // Filter out debug logs unless verbose is enabled
        if (effect.level !== "debug" || verbose) {
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
        case "debug":
          return "Debug";
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
      switch (effect.level) {
        case "error":
          return "red";
        case "warn":
          return "yellow";
        case "debug":
          return undefined; // dim by default
        default:
          return "blue";
      }
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
            key={`${effect._tag}:${getEffectPayload(effect)}`}
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
 * @param effect - The effect to check
 * @param verbose - If true, include debug logs
 */
const isVisibleEffect = (effect: Effect, verbose = false): boolean => {
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
      // Filter out debug logs unless verbose is enabled
      if (effect.level === "debug") {
        return verbose;
      }
      return true;
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
const EffectTimeline = ({
  effects,
  verbose = false,
}: {
  effects: TimedEffect[];
  verbose?: boolean;
}) => {
  // Filter to visible effects only and deduplicate MakeDir by path
  const seenDirPaths = new Set<string>();
  const visibleEffects = effects.filter((e) => {
    if (!isVisibleEffect(e.effect, verbose)) return false;
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
  verbose = false,
}: {
  effects: Effect[];
  title?: string;
  verbose?: boolean;
}) => {
  // Filter to visible effects only and deduplicate MakeDir by path
  const seenDirPaths = new Set<string>();
  const visibleEffects = effects.filter((e) => {
    if (!isVisibleEffect(e, verbose)) return false;
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
 * Display all completed answers in a borderless table format for confirmation review.
 */
const CompletedAnswersTable = ({
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

  // Calculate max width for the question column (for alignment)
  const maxQuestionWidth = Math.max(
    ...activePrompts.map((p) => p.message.length),
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      {activePrompts.map((prompt) => {
        const value = answers[prompt.name];
        const displayValue = formatAnswerValue(value, prompt);

        return (
          <Box key={prompt.name}>
            <Text color="green">✔ </Text>
            <Text dimColor>{prompt.message.padEnd(maxQuestionWidth)}</Text>
            <Text dimColor> </Text>
            <Text color="cyan">{displayValue}</Text>
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * Display a summary of planned effects in a borderless table format.
 */
const EffectsSummaryTable = ({ effects }: { effects: Effect[] }) => {
  const files = new Set<string>();
  const directories = new Set<string>();
  const copied = new Set<string>();
  const deleted = new Set<string>();
  let commands = 0;

  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
      case "AppendFile":
        files.add(effect.path);
        break;
      case "MakeDir":
        directories.add(effect.path);
        break;
      case "CopyFile":
        copied.add(effect.dest);
        break;
      case "CopyDirectory":
        copied.add(effect.dest);
        break;
      case "DeleteFile":
      case "DeleteDirectory":
        deleted.add(effect.path);
        break;
      case "Exec":
        commands++;
        break;
    }
  }

  // Build rows for non-zero counts
  const rows: Array<{ label: string; count: number; color: string }> = [];

  if (files.size > 0) {
    rows.push({
      label: `File${files.size > 1 ? "s" : ""} to create`,
      count: files.size,
      color: "green",
    });
  }
  if (directories.size > 0) {
    rows.push({
      label: `Director${directories.size > 1 ? "ies" : "y"} to create`,
      count: directories.size,
      color: "green",
    });
  }
  if (copied.size > 0) {
    rows.push({
      label: `Item${copied.size > 1 ? "s" : ""} to copy`,
      count: copied.size,
      color: "cyan",
    });
  }
  if (deleted.size > 0) {
    rows.push({
      label: `Item${deleted.size > 1 ? "s" : ""} to delete`,
      count: deleted.size,
      color: "red",
    });
  }
  if (commands > 0) {
    rows.push({
      label: `Command${commands > 1 ? "s" : ""} to run`,
      count: commands,
      color: "yellow",
    });
  }

  if (rows.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text dimColor>No operations planned.</Text>
      </Box>
    );
  }

  // Calculate max label width for alignment
  const maxLabelWidth = Math.max(...rows.map((r) => r.label.length));

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold dimColor>
        Operations:
      </Text>
      {rows.map((row) => (
        <Box key={row.label}>
          <Text dimColor> {row.label.padEnd(maxLabelWidth)} </Text>
          <Text color={row.color as "green" | "cyan" | "red" | "yellow"}>
            {row.count}
          </Text>
        </Box>
      ))}
    </Box>
  );
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

// =============================================================================
// File Content View - Full file content display (for Ctrl+O toggle)
// =============================================================================

/**
 * Display the full content of all WriteFile/AppendFile effects.
 * Used when the user toggles file content view with Ctrl+O.
 */
const FileContentView = ({ effects }: { effects: Effect[] }) => {
  const writeEffects = effects.filter(
    (e): e is Effect & { _tag: "WriteFile" | "AppendFile" } =>
      e._tag === "WriteFile" || e._tag === "AppendFile",
  );

  if (writeEffects.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text dimColor>No file contents to display.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold dimColor>
        File contents:
      </Text>
      {writeEffects.map((effect, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: path may be duplicated across effects
        <Box key={`${effect.path}-${i}`} flexDirection="column" marginTop={1}>
          <Text color="green" bold>
            {effect.path}
          </Text>
          <Box marginLeft={1}>
            <Text>{formatContentPreview(effect.content)}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// =============================================================================
// App State and Component
// =============================================================================

export type AppState =
  | { phase: "loading" }
  | { phase: "prompting" }
  | { phase: "preview"; effects: Effect[] }
  | {
      phase: "confirming";
      effects: Effect[];
      promptAnswers: Record<string, unknown>;
    }
  | { phase: "undoPreview"; planEffects: Effect[] }
  | {
      phase: "confirmingUndo";
      undos: Task<void>[];
      planEffects: Effect[];
      unreversible: Effect[];
    }
  | { phase: "undone"; undoCount: number; unreversible: Effect[] }
  | { phase: "executing"; task: Task<void> }
  | { phase: "complete"; effects: TimedEffect[]; duration: number }
  | { phase: "error"; error: TaskError; answers?: Record<string, unknown> };

export interface AppProps {
  /** The generator to run */
  generator: GeneratorDefinition;
  /** Whether to show a preview before executing */
  preview?: boolean;
  /** Whether to run in dry-run mode only */
  dryRunOnly?: boolean;
  /** Whether to reverse a previously executed generator */
  undo?: boolean;
  /** Whether to show debug output */
  verbose?: boolean;
  /** Pre-filled answers (for non-interactive mode) */
  answers?: Record<string, unknown>;
  /**
   * Wizard mode over a PARTIAL answer set: `answers` are the explicitly
   * provided ones — never re-asked, shown as completed — and the wizard asks
   * exactly the pending prompts (empty set ⇒ straight to preview/confirm).
   * Without this flag, provided `answers` skip prompting entirely (a run).
   */
  askMissing?: boolean;
  /** Skip confirmation gates (`--yes`) */
  yes?: boolean;
  /** Stamp configuration for generated files (undefined = no stamps) */
  stamp?: StampConfig;
}

export const App = ({
  generator,
  preview = true,
  dryRunOnly = false,
  undo = false,
  verbose = false,
  answers: prefilledAnswers,
  askMissing = false,
  yes = false,
  stamp,
}: AppProps) => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(
    prefilledAnswers && !askMissing
      ? { phase: "loading" }
      : { phase: "prompting" },
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    prefilledAnswers ?? {},
  );
  const [showFiles, setShowFiles] = useState(false);
  // Set once the user navigates BACK from the confirm gate: the re-entered
  // wizard asks EVERY prompt again (previous values pre-filled) instead of
  // seeding `provided` — with a fully-explicit invocation the pending set is
  // empty, so a kept seed would auto-complete straight back to the gate and
  // make the advertised `esc to go back` a no-op.
  const [reasking, setReasking] = useState(false);

  // Generate the task, entering the error phase on ANY throw — §3's exit
  // contract: a rendered failure never exits 0. A generator-raised typed
  // invalid answer (a cross-answer constraint its `generate` enforces — two
  // answers only valid together; no shipped generator raises one today) is
  // the usage class
  // (GENERATOR_INVALID_ANSWER → the effect's exit 2); any OTHER throw is a
  // generator bug rendered as GENERATE_ERROR — the run/wizard sibling of the
  // batch arms' bare stderr line — carrying the runtime class (exit 1).
  // Re-throwing it (the old behavior) reached Ink's error boundary, which
  // renders a crash box but sets NO exit code: `summon … --yes` under bun
  // exited 0 on a failed run.
  //
  // The SUCCESS path is validated too: `undefined` is this helper's
  // "already handled, stop" sentinel, so a `generate()` that RETURNS
  // undefined/null (a plain-JS generator that forgot its `return` — the
  // `--generators` extension point is untyped) must not be forwarded as
  // that sentinel — no state would be set, no exit code owned, and the
  // App would sit in phase limbo with `waitUntilExit` pending FOREVER.
  // It is the same generator-bug class as a throw: GENERATE_ERROR, named.
  const generateTask = useCallback(
    (promptAnswers: Record<string, unknown>): Task<void> | undefined => {
      try {
        // The wider type is honest: `--generators` loads unchecked JS, so
        // the declared `Task<void>` is a promise the author may break.
        const task: Task<void> | undefined | null =
          generator.generate(promptAnswers);
        if (task === undefined || task === null) {
          setState({
            phase: "error",
            error: {
              code: "GENERATE_ERROR",
              message: `${generator.meta.name}'s generate returned no task`,
            },
            answers: promptAnswers,
          });
          return undefined;
        }
        return task;
      } catch (error) {
        setState({
          phase: "error",
          error: isInvalidAnswersError(error)
            ? { code: GENERATOR_INVALID_ANSWER, message: error.message }
            : {
                code: "GENERATE_ERROR",
                message: error instanceof Error ? error.message : String(error),
              },
          answers: promptAnswers,
        });
        return undefined;
      }
    },
    [generator],
  );

  const runUndoPlan = useCallback(
    (
      undos: Task<void>[],
      unreversible: Effect[],
      promptAnswers: Record<string, unknown>,
    ) => {
      (async () => {
        try {
          const { undoCount } = await runCollectedUndos(undos);
          setState({ phase: "undone", undoCount, unreversible });
        } catch (err) {
          setState({
            phase: "error",
            error:
              err instanceof Error
                ? { code: "UNDO_ERROR", message: err.message }
                : { code: "UNKNOWN_ERROR", message: String(err) },
            answers: promptAnswers,
          });
        }
      })();
    },
    [],
  );

  const handlePromptsComplete = useCallback(
    (promptAnswers: Record<string, unknown>) => {
      setAnswers(promptAnswers);

      const task = generateTask(promptAnswers);
      if (task === undefined) return;

      // Undo mode: collect the plan ONCE (host-backed Exists resolution, so
      // branch selection matches the run being undone), show it, and execute
      // exactly the collected undos — never re-walk the task in between.
      if (undo) {
        try {
          const unreversible: Effect[] = [];
          const undos = collectUndos(task, {
            resolveExists: hostExistsResolver(),
            onForwardEffect: (effect) => {
              if (isUnreversibleExec(effect)) unreversible.push(effect);
            },
          });
          if (undos.length === 0) {
            setState({
              phase: "error",
              error: { code: "NOTHING_TO_UNDO", message: "Nothing to undo." },
            });
            return;
          }
          const planEffects = describeUndoSteps(undos);
          if (dryRunOnly) {
            setState({ phase: "undoPreview", planEffects });
            return;
          }
          // Same gate contract as the forward run: flags only pre-fill
          // answers; `--yes` skips the gate, and so does `--no-preview` —
          // the forward flow goes straight to executing in both cases.
          if (shouldSkipUndoGate({ yes, preview })) {
            runUndoPlan(undos, unreversible, promptAnswers);
            return;
          }
          setState({
            phase: "confirmingUndo",
            undos,
            planEffects,
            unreversible,
          });
        } catch (err) {
          setState({
            phase: "error",
            error:
              err instanceof Error
                ? { code: "UNDO_ERROR", message: err.message }
                : { code: "UNKNOWN_ERROR", message: String(err) },
            answers: promptAnswers,
          });
        }
        return;
      }

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
            answers: promptAnswers,
          });
        }
      } else {
        setState({ phase: "executing", task });
      }
    },
    [generateTask, preview, dryRunOnly, undo, yes, runUndoPlan],
  );

  const handleConfirm = useCallback(() => {
    // The same catch as the preview's generate: a re-generate at the confirm
    // gate normally re-runs what already succeeded, but a stateful generator
    // throwing HERE must land in the error phase too, not in Ink's boundary.
    const task = generateTask(answers);
    if (task === undefined) return;
    setState({ phase: "executing", task });
  }, [generateTask, answers]);

  const handleCancel = useCallback(() => {
    exit();
  }, [exit]);

  const handleExecutionComplete = useCallback(
    (effects: TimedEffect[], duration: number) => {
      setState({ phase: "complete", effects, duration });
    },
    [],
  );

  const handleExecutionError = useCallback(
    (error: TaskError) => {
      setState({ phase: "error", error, answers });
    },
    [answers],
  );

  // Handle pre-filled answers (run mode only — askMissing starts prompting)
  useEffect(() => {
    if (prefilledAnswers && !askMissing && state.phase === "loading") {
      handlePromptsComplete(prefilledAnswers);
    }
  }, [prefilledAnswers, askMissing, state.phase, handlePromptsComplete]);

  // The error phase owns the process exit code (the cross-CLI matrix): a
  // rendered failure must not exit 0 — pragma routes the same failures
  // through mapExitCode (usage → 2, everything else → 1). The typed invalid
  // answer (a generator's cross-answer guard) is the usage class; every
  // other rendered failure — execution, dry-run, undo — is a runtime
  // failure. Only the exit code is owned here: the rendering above it stays
  // host UI, and a deliberate cancel (n at the confirm gate) keeps exit 0.
  useEffect(() => {
    if (state.phase !== "error") return;
    process.exitCode = state.error.code === GENERATOR_INVALID_ANSWER ? 2 : 1;
  }, [state]);

  // Handle going back from confirmation to prompting. Clearing the provided
  // seed (via `reasking`) is what keeps esc meaningful when the wizard had
  // nothing left to ask — the flag-given answers are exactly what the user
  // may want to change.
  const handleGoBack = useCallback(() => {
    setShowFiles(false);
    setReasking(true);
    setState({ phase: "prompting" });
  }, []);

  const handleUndoConfirm = useCallback(() => {
    if (state.phase !== "confirmingUndo") return;
    runUndoPlan(state.undos, state.unreversible, answers);
  }, [state, runUndoPlan, answers]);

  // Handle confirm/cancel/back/show-files input when in a confirming state
  useInput(
    (input, key) => {
      if (state.phase === "confirming") {
        // Ctrl+O toggles file content view
        if (key.ctrl && input === "o") {
          setShowFiles((prev) => !prev);
        } else if (key.escape) {
          handleGoBack();
        } else if (key.return || input.toLowerCase() === "y") {
          // Enter or Y confirms
          handleConfirm();
        } else if (input.toLowerCase() === "n") {
          handleCancel();
        }
      } else if (state.phase === "confirmingUndo") {
        if (key.return || input.toLowerCase() === "y") {
          handleUndoConfirm();
        } else if (key.escape || input.toLowerCase() === "n") {
          handleCancel();
        }
      }
    },
    {
      isActive:
        state.phase === "confirming" || state.phase === "confirmingUndo",
    },
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
          provided={askMissing && !reasking ? prefilledAnswers : undefined}
        />
      )}

      {state.phase === "preview" && (
        <Box flexDirection="column">
          <DryRunTimeline
            effects={state.effects}
            title="Plan (dry-run):"
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text dimColor>Dry-run complete. No files were modified.</Text>
          </Box>
        </Box>
      )}

      {state.phase === "undoPreview" && (
        <Box flexDirection="column">
          <DryRunTimeline
            effects={state.planEffects}
            title="Undo plan (dry-run):"
            verbose={verbose}
          />
          <Box marginTop={1}>
            <Text dimColor>Dry-run complete. No files were modified.</Text>
          </Box>
        </Box>
      )}

      {state.phase === "confirmingUndo" && (
        <Box flexDirection="column">
          <DryRunTimeline
            effects={state.planEffects}
            title={`Undo will reverse ${state.undos.length} step${state.undos.length === 1 ? "" : "s"}:`}
            verbose={verbose}
          />
          {state.unreversible.length > 0 && (
            <Box marginTop={1}>
              <Text color="yellow">
                {state.unreversible.length} exec step
                {state.unreversible.length === 1 ? "" : "s"} (e.g. installs)
                cannot be reversed; artifacts may remain.
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="magenta">› </Text>
            <Text bold>Reverse these steps? </Text>
            <Text dimColor>(y/N) </Text>
            <Text dimColor italic>
              esc to cancel
            </Text>
          </Box>
        </Box>
      )}

      {state.phase === "undone" && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">
              ✓ Undo complete ({state.undoCount} step
              {state.undoCount === 1 ? "" : "s"} reversed).
            </Text>
          </Box>
          {state.unreversible.length > 0 && (
            <Box marginTop={1}>
              <Text dimColor>
                Note: {state.unreversible.length} exec step
                {state.unreversible.length === 1 ? "" : "s"} were not reversed;
                their artifacts may remain.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {state.phase === "confirming" && (
        <Box flexDirection="column">
          {/* Show completed answers in table format */}
          <CompletedAnswersTable
            prompts={generator.prompts}
            answers={state.promptAnswers}
          />
          {/* Show effects summary or file contents based on toggle */}
          {showFiles ? (
            <FileContentView effects={state.effects} />
          ) : (
            <EffectsSummaryTable effects={state.effects} />
          )}
          {/* Confirmation prompt with escape hint and Ctrl+O hint */}
          <Box>
            <Text color="magenta">› </Text>
            <Text bold>Proceed? </Text>
            <Text dimColor>(Y/n) </Text>
            <Text dimColor italic>
              esc to go back · ctrl+o {showFiles ? "hide" : "show"} file
              contents
            </Text>
          </Box>
        </Box>
      )}

      {state.phase === "executing" && (
        <ExecutionProgress
          task={state.task}
          onComplete={handleExecutionComplete}
          onError={handleExecutionError}
          stamp={stamp}
        />
      )}

      {state.phase === "complete" && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">✓ Generation complete!</Text>
          </Box>
          <EffectTimeline effects={state.effects} verbose={verbose} />
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
          {state.answers && Object.keys(state.answers).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor bold>
                Arguments:
              </Text>
              <Box flexDirection="column" marginLeft={1}>
                {Object.entries(state.answers).map(([key, value]) => (
                  <Box key={key}>
                    <Text dimColor>
                      {key}: {JSON.stringify(value)}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
