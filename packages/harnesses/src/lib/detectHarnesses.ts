/**
 * Harness detection expressed as Task values.
 * All filesystem checks go through @canonical/task primitives.
 */

import {
  exists,
  flatMap,
  map,
  pure,
  type Task,
  traverse,
} from "@canonical/task";
import harnesses from "./harnesses.js";
import type {
  DetectedHarness,
  DetectionSignal,
  HarnessDefinition,
} from "./types.js";

const resolveSignalPath = (
  signal: DetectionSignal & { type: "directory" | "file" },
  projectRoot: string,
): string => {
  if (signal.path.startsWith("~")) {
    return signal.path.replace("~", process.env.HOME ?? "");
  }
  return `${projectRoot}/${signal.path}`;
};

/**
 * Check a single detection signal — returns true if the signal matches.
 *
 * @note This function is impure for "directory" and "file" signals — it
 * checks the filesystem via Task effects. "extension", "process", and "env"
 * signals are not yet implemented and return false.
 */
const checkSignal = (
  signal: DetectionSignal,
  projectRoot: string,
): Task<boolean> => {
  switch (signal.type) {
    case "directory":
    case "file": {
      const resolved = resolveSignalPath(signal, projectRoot);
      return exists(resolved);
    }
    default:
      return pure(false);
  }
};

const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 } as const;

/**
 * Score an array of signal check results into a confidence level.
 * Returns null if no signals matched.
 */
const scoreConfidence = (
  results: readonly boolean[],
  signals: readonly DetectionSignal[],
): "high" | "medium" | "low" | null => {
  const matched = results.filter(Boolean).length;
  if (matched === 0) return null;

  const hasHighSignal = signals.some(
    (s, i) => results[i] && (s.type === "directory" || s.type === "file"),
  );
  if (hasHighSignal) return "high";
  if (matched > 1) return "medium";
  return "low";
};

/**
 * Detect a single harness by checking all its signals and scoring confidence.
 */
const detectOne = (
  harness: HarnessDefinition,
  projectRoot: string,
): Task<DetectedHarness | null> =>
  flatMap(
    traverse(harness.detect as DetectionSignal[], (signal) =>
      checkSignal(signal, projectRoot),
    ),
    (results) => {
      const confidence = scoreConfidence(results, harness.detect);
      if (!confidence) return pure(null);

      const configPath = harness.configPath(projectRoot);
      return map(
        exists(configPath),
        (configExists): DetectedHarness => ({
          harness,
          confidence,
          configExists,
          configPath,
        }),
      );
    },
  );

/**
 * Detect all known harnesses in the given project root.
 * Returns detected harnesses sorted by confidence (high first).
 *
 * @note This function is impure — it checks the filesystem for harness
 * signals via Task effects.
 */
export default function detectHarnesses(
  projectRoot: string,
): Task<DetectedHarness[]> {
  return map(
    traverse(harnesses as HarnessDefinition[], (h) =>
      detectOne(h, projectRoot),
    ),
    (results) =>
      results
        .filter((r): r is DetectedHarness => r !== null)
        .sort(
          (a, b) =>
            CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence],
        ),
  );
}
