import type { PresentationPatch, ViewPresentation } from "./types.js";

/**
 * The patch that takes one arrangement to another: every key whose value
 * differs, with its new value, and undefined for a key that is gone.
 */
export default function diffPresentations(
  before: ViewPresentation,
  after: ViewPresentation,
): PresentationPatch {
  const moved: Record<string, ViewPresentation[string] | undefined> = {};
  for (const key of new Set([...Object.keys(after), ...Object.keys(before)])) {
    if (
      after[key] !== before[key] &&
      JSON.stringify(after[key]) !== JSON.stringify(before[key])
    ) {
      moved[key] = after[key];
    }
  }
  return moved;
}
