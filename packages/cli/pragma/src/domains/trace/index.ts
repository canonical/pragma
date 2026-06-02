/**
 * @module Trace domain — CLI commands for query access tracing.
 *
 * Commands: `pragma trace`, `pragma trace sessions`, `pragma trace clear`.
 * Plugin: {@link createTracePlugin} (wired in bootStore when PRAGMA_TRACE=1).
 */

import type { CommandDefinition } from "@canonical/cli-core";
import {
  clearCommand,
  sessionsCommand,
  showCommand,
} from "./commands/index.js";

export function commands(): CommandDefinition[] {
  return [showCommand, sessionsCommand, clearCommand];
}
