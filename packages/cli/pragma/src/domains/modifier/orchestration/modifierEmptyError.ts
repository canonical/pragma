import { PragmaError } from "#error";

export default function modifierEmptyError(): PragmaError {
  return PragmaError.emptyResults("modifier", {
    recovery: {
      message:
        "Ensure design system packages are installed: bun add -D @canonical/ds-global",
    },
  });
}
