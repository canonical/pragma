import type { Effect } from "@canonical/task";
import type StampConfig from "../types/StampConfig.js";
import applyStamp from "./applyStamp.js";

/**
 * Build an `onEffectStart` seam callback that prepends the generated-file
 * stamp to every `WriteFile` effect's content before it executes.
 *
 * This is THE stamping path: every binary that stamps generated output does so
 * through this one transform on the shared executor's seam, so `pragma create
 * X` and `summon X` write byte-identical files.
 *
 * @param stamp - The stamp configuration (generator name/version).
 * @param next - An optional downstream `onEffectStart` (e.g. progress UI),
 * invoked after stamping.
 * @returns The composed `onEffectStart` callback.
 */
export default function createStampOnEffectStart(
  stamp: StampConfig,
  next?: (effect: Effect) => void,
): (effect: Effect) => void {
  return (effect) => {
    if (effect._tag === "WriteFile") {
      (effect as { content: string }).content = applyStamp(
        effect.path,
        effect.content,
        stamp,
      );
    }
    next?.(effect);
  };
}
