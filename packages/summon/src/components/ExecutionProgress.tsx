/**
 * ExecutionProgress Component
 *
 * Displays the progress of task execution with effect-by-effect feedback.
 */

import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { describeEffect } from "../effect.js";
import { runTask } from "../interpreter.js";
import type { Effect, Task, TaskError } from "../types.js";
import { Spinner } from "./Spinner.js";

/** Effect with timing information for the completion timeline */
export interface TimedEffect {
  effect: Effect;
  /** Time in ms when this effect completed, relative to execution start */
  timestamp: number;
}

export interface ExecutionProgressProps {
  /** The task to execute */
  task: Task<void>;
  /** Whether to run in dry-run mode */
  dryRun?: boolean;
  /** Called when execution completes */
  onComplete: (effects: TimedEffect[], duration: number) => void;
  /** Called when execution fails */
  onError: (error: TaskError) => void;
}

interface CompletedEffect {
  id: number;
  effect: Effect;
  duration: number;
  timestamp: number;
}

interface LogMessage {
  id: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}

/** Effects that should be hidden from the progress display (internal/noisy) */
const isInternalEffect = (effect: Effect): boolean => {
  // Hide internal coordination effects
  if (
    effect._tag === "Log" ||
    effect._tag === "Exists" ||
    effect._tag === "ReadContext" ||
    effect._tag === "WriteContext" ||
    effect._tag === "Parallel" ||
    effect._tag === "Race"
  ) {
    return true;
  }
  // Hide template file reads (internal implementation detail)
  if (effect._tag === "ReadFile" && effect.path.includes("/templates/")) {
    return true;
  }
  return false;
};

export const ExecutionProgress: React.FC<ExecutionProgressProps> = ({
  task,
  dryRun: _dryRun = false,
  onComplete,
  onError,
}) => {
  const [currentEffect, setCurrentEffect] = useState<Effect | null>(null);
  const [completedEffects, setCompletedEffects] = useState<CompletedEffect[]>(
    [],
  );
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const collectedEffects: TimedEffect[] = [];
    const startTime = performance.now();
    let effectId = 0;
    let logId = 0;
    // Track seen directory paths to deduplicate MakeDir effects in live progress
    const seenDirPaths = new Set<string>();

    const executeWithProgress = async () => {
      try {
        await runTask(task, {
          onEffectStart: (effect) => {
            // Skip showing duplicate MakeDir in spinner
            if (effect._tag === "MakeDir" && seenDirPaths.has(effect.path)) {
              return;
            }
            setCurrentEffect(effect);
          },
          onEffectComplete: (effect, duration) => {
            const id = effectId++;
            const timestamp = performance.now() - startTime;
            collectedEffects.push({ effect, timestamp });
            // Skip duplicate MakeDir effects in live display
            if (effect._tag === "MakeDir") {
              if (seenDirPaths.has(effect.path)) {
                setCurrentEffect(null);
                return;
              }
              seenDirPaths.add(effect.path);
            }
            setCompletedEffects((prev) => [
              ...prev,
              { id, effect, duration, timestamp },
            ]);
            setCurrentEffect(null);
          },
          onLog: (level, message) => {
            const id = logId++;
            setLogMessages((prev) => [...prev, { id, level, message }]);
          },
        });

        const duration = performance.now() - startTime;
        onComplete(collectedEffects, duration);
      } catch (err) {
        const taskError: TaskError =
          err instanceof Error
            ? {
                code: "EXECUTION_ERROR",
                message: err.message,
                stack: err.stack,
              }
            : {
                code: "UNKNOWN_ERROR",
                message: String(err),
              };
        onError(taskError);
      } finally {
        setIsRunning(false);
      }
    };

    executeWithProgress();
  }, [task, onComplete, onError]);

  const logColor = (level: LogMessage["level"]) => {
    switch (level) {
      case "debug":
        return "gray";
      case "info":
        return "blue";
      case "warn":
        return "yellow";
      case "error":
        return "red";
    }
  };

  const logIcon = (level: LogMessage["level"]) => {
    switch (level) {
      case "debug":
        return "·";
      case "info":
        return "›";
      case "warn":
        return "⚠";
      case "error":
        return "✗";
    }
  };

  return (
    <Box flexDirection="column">
      {/* Show log messages */}
      {logMessages.map((log) => (
        <Text key={`log-${log.id}`}>
          <Text color={logColor(log.level)}>{logIcon(log.level)}</Text>{" "}
          <Text>{log.message}</Text>
        </Text>
      ))}
      {/* Show completed file effects (excluding internal/noisy effects) */}
      {completedEffects
        .filter((item) => !isInternalEffect(item.effect))
        .map((item) => (
          <Text key={`effect-${item.id}`}>
            <Text color="green">✓</Text> {describeEffect(item.effect)}{" "}
            <Text dimColor>({item.duration.toFixed(0)}ms)</Text>
          </Text>
        ))}
      {currentEffect && !isInternalEffect(currentEffect) && (
        <Box>
          <Spinner color="blue" />
          <Text> {describeEffect(currentEffect)}</Text>
        </Box>
      )}
      {isRunning && !currentEffect && (
        <Box>
          <Spinner color="blue" label="Executing..." />
        </Box>
      )}
    </Box>
  );
};
