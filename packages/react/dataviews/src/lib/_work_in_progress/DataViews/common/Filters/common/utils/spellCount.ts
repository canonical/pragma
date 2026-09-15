import type { Count } from "@canonical/dataviews-core";

/**
 * A count as it is shown beside the control it describes: exact, a lower
 * bound, or null where the source counted nothing.
 */
export default function spellCount(count: Count): string | null {
  switch (count.kind) {
    case "exact":
      return String(count.value);
    case "at-least":
      return `at least ${count.value}`;
    case "unknown":
      return null;
  }
}
