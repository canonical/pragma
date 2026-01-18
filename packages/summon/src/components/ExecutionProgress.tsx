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

export interface ExecutionProgressProps {
  /** The task to execute */
  task: Task<void>;
  /** Whether to run in dry-run mode */
  dryRun?: boolean;
  /** Called when execution completes */
  onComplete: (effects: Effect[], duration: number) => void;
  /** Called when execution fails */
  onError: (error: TaskError) => void;
}

interface CompletedEffect {
  id: number;
  effect: Effect;
  duration: number;
}

interface LogMessage {
  id: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}

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
    const collectedEffects: Effect[] = [];
    const startTime = performance.now();
    let effectId = 0;
    let logId = 0;

    const executeWithProgress = async () => {
      try {
        await runTask(task, {
          onEffectStart: (effect) => {
            setCurrentEffect(effect);
          },
          onEffectComplete: (effect, duration) => {
            const id = effectId++;
            collectedEffects.push(effect);
            setCompletedEffects((prev) => [...prev, { id, effect, duration }]);
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
      {/* Show completed file effects */}
      {completedEffects
        .filter((item) => item.effect._tag !== "Log")
        .map((item) => (
          <Text key={`effect-${item.id}`}>
            <Text color="green">✓</Text> {describeEffect(item.effect)}{" "}
            <Text dimColor>({item.duration.toFixed(0)}ms)</Text>
          </Text>
        ))}
      {currentEffect && (
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
