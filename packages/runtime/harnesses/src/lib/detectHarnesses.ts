/**
 * Harness detection expressed as Task values.
 * All environment probes go through {@link checkSignal} (filesystem, PATH, and
 * process checks via @canonical/task primitives), scored by {@link scoreConfidence}.
 */

import {
  exists,
  flatMap,
  map,
  pure,
  type Task,
  traverse,
} from "@canonical/task";
import { defaultBandOf, resolveConfigTarget } from "./config.js";
import harnesses from "./harnesses.js";
import { type PlatformEnv, readPlatformEnv } from "./platformPaths.js";
import {
  CONFIDENCE_RANK,
  checkSignal,
  type DetectContext,
  scoreConfidence,
} from "./signals.js";
import type {
  DetectedHarness,
  DetectionSignal,
  HarnessDefinition,
} from "./types.js";

/**
 * Detect a single harness by checking all its signals and scoring confidence.
 */
const detectOne = (
  harness: HarnessDefinition,
  ctx: DetectContext,
): Task<DetectedHarness | null> =>
  flatMap(
    traverse(harness.detect as DetectionSignal[], (signal) =>
      checkSignal(signal, ctx),
    ),
    (results) => {
      const confidence = scoreConfidence(results, harness.detect);
      if (!confidence) return pure(null);

      // Report the harness's DEFAULT-band file (the home config for a
      // global-only harness, the project file otherwise) so the recap and
      // doctor point at the location the default `setup` would write.
      const { path: configPath } = resolveConfigTarget(
        harness,
        ctx.projectRoot,
        defaultBandOf(harness),
        ctx.platform,
      );
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
 * @param projectRoot - The project root probed for project-relative signals.
 * @param platform - The captured host (defaults to the live reader); injected in
 *   tests to drive OS/env branches deterministically.
 * @returns A Task yielding the detected harnesses, sorted by confidence.
 * @note Impure — checks the filesystem / PATH for harness signals via Task
 * effects (and, via the default `platform`, reads the live host once).
 */
export default function detectHarnesses(
  projectRoot: string,
  platform: PlatformEnv = readPlatformEnv(),
): Task<DetectedHarness[]> {
  const ctx: DetectContext = { projectRoot, platform };
  return map(
    traverse(harnesses as HarnessDefinition[], (h) => detectOne(h, ctx)),
    (results) =>
      results
        .filter((r): r is DetectedHarness => r !== null)
        .sort(
          (a, b) =>
            CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence],
        ),
  );
}
