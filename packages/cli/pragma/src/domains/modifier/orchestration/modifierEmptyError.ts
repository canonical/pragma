import { PragmaError } from "#error";

export default function modifierEmptyError(): PragmaError {
  // `modifier list` takes no filters, so an empty result always means the
  // design system packages that supply modifier triples are absent. The
  // recovery is the runnable install command, not a (non-existent) widen.
  return PragmaError.emptyResults("modifier", {
    recovery: {
      // The base error already states "No modifiers found"; the recovery adds
      // only the cause + the runnable fix (the cli line is what renders on CLI).
      message: "Install the design system packages that provide modifiers.",
      cli: "bun add -D @canonical/design-system",
    },
  });
}
