/**
 * Wires the `pragma trace sessions` CLI command.
 *
 * Lists all available trace sessions with metadata.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { traceDir } from "../../refs/operations/paths.js";
import { selectFormatter } from "../../shared/formatters.js";
import { sessionsFormatters } from "../formatters/index.js";
import { listSessions } from "../operations/index.js";

const sessionsCommand: CommandDefinition = {
  path: ["trace", "sessions"],
  description: "List available trace sessions",
  parameters: [],
  meta: {
    examples: ["pragma trace sessions"],
  },
  async execute(_params, ctx) {
    const sessions = listSessions(traceDir());

    return createOutputResult(sessions, {
      plain: selectFormatter(ctx, sessionsFormatters),
    });
  },
};

export default sessionsCommand;
