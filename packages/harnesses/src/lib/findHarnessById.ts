import harnesses from "./harnesses.js";
import type { HarnessDefinition } from "./types.js";

/**
 * Find a harness definition by its ID.
 */
export default function findHarnessById(
  id: string,
): HarnessDefinition | undefined {
  return harnesses.find((h) => h.id === id);
}
