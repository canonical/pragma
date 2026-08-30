/**
 * The default {@link MountOutcome} presentation both bins share — the ONLY
 * process-touching export in either projection seam: the parity bytes on
 * stderr, the outcome's code on `process.exitCode`.
 *
 * @note Impure — writes stderr, sets the process exit code.
 */

import { renderUsageError } from "../usage.js";
import type { MountOutcome } from "./registerGeneratorCommands.js";

export default function emitToProcess(outcome: MountOutcome): void {
  process.stderr.write(
    outcome.kind === "usage-error"
      ? `${renderUsageError(outcome.error)}\n`
      : outcome.help,
  );
  process.exitCode = outcome.exitCode;
}
