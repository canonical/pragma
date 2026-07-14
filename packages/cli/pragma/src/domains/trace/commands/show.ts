/**
 * Wires the `pragma trace` CLI command.
 *
 * Shows query trace records from the latest (or specified) session.
 * Supports `--follow` / `-f` for real-time tailing.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { traceDir } from "../../refs/operations/paths.js";
import { selectFormatter } from "../../shared/formatters.js";
import {
  noSessionsFormatters,
  sessionNotFoundFormatters,
  showFormatters,
} from "../formatters/index.js";
import {
  followTraceLog,
  listSessions,
  readTraceLog,
} from "../operations/index.js";

/** Number of trace records shown when `--limit` is omitted. */
const DEFAULT_TRACE_LIMIT = 50;

/**
 * Resolve the `--limit` value into a positive integer record count.
 *
 * @param raw - The raw param value.
 * @returns The default when absent, else the validated positive integer.
 * @throws PragmaError INVALID_INPUT when present but not a positive integer.
 */
export function resolveTraceLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_TRACE_LIMIT;
  }
  const text = String(raw).trim();
  const parsed = Number(text);
  if (!/^\d+$/.test(text) || parsed < 1) {
    throw PragmaError.invalidInput("limit", String(raw), {
      recovery: { message: "Provide a positive integer." },
    });
  }
  return parsed;
}

function formatOneLine(r: import("../types.js").TraceRecord): string {
  const d = new Date(r.ts);
  const time = [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join(":");
  const type = r.type.toUpperCase().padEnd(10);
  // Match the non-follow formatter: ASK → true/false, CONSTRUCT → triples,
  // SELECT (and anything else) → rows.
  const plural = (n: number, word: string) =>
    `${n} ${word}${n !== 1 ? "s" : ""}`;
  const count = (
    r.type === "ask"
      ? r.ask
        ? "true"
        : "false"
      : r.type === "construct"
        ? plural(r.count, "triple")
        : plural(r.count, "row")
  ).padEnd(12);
  const ms = `${r.ms}ms`.padEnd(9);
  const q = r.q.replace(/\s+/g, " ").trim();
  const query = q.length > 100 ? `${q.slice(0, 97)}...` : q;
  return `#${String(r.seq).padEnd(4)} ${time}  ${type}${count}${ms} ${r.qh}  ${query}`;
}

const showCommand: CommandDefinition = {
  path: ["trace"],
  description: "View query access traces",
  parameters: [
    {
      name: "follow",
      description: "Tail the log in real time",
      type: "boolean",
      short: "f",
      default: false,
    },
    {
      name: "session",
      description: "Session ID to view (default: latest)",
      type: "string",
    },
    {
      name: "limit",
      description: "Maximum number of records to show",
      type: "string",
      default: "50",
    },
  ],
  meta: {
    examples: [
      "pragma trace",
      "pragma trace -f",
      "pragma trace --limit 20",
      "pragma trace --session 20260512-143022-a7f3",
    ],
  },
  async execute(params, ctx) {
    // Validate --limit up front so a bad value is rejected regardless of
    // whether any sessions exist.
    const limit = resolveTraceLimit(params.limit);

    const dir = traceDir();
    const sessions = listSessions(dir);

    if (sessions.length === 0) {
      return createOutputResult(undefined, {
        plain: selectFormatter(ctx, noSessionsFormatters),
      });
    }

    const sessionId =
      typeof params.session === "string"
        ? params.session
        : sessions[0]?.sessionId;
    const target = sessions.find((s) => s.sessionId === sessionId);

    if (!target) {
      return createOutputResult(
        {
          requested: sessionId ?? "(unknown)",
          available: sessions.map((s) => s.sessionId),
        },
        { plain: selectFormatter(ctx, sessionNotFoundFormatters) },
      );
    }

    // Follow mode — stream new records to stdout and block
    if (params.follow === true) {
      process.stdout.write(
        `Following session ${target.sessionId} (ctrl+c to stop)\n\n`,
      );

      const stop = followTraceLog(target.path, (record) => {
        process.stdout.write(`${formatOneLine(record)}\n`);
      });

      // Block until interrupted
      await new Promise<void>((resolve) => {
        const handler = () => {
          stop();
          resolve();
        };
        process.once("SIGINT", handler);
        process.once("SIGTERM", handler);
      });

      return createOutputResult("", { plain: () => "" });
    }

    // Normal mode — read and format (limit validated at the top of execute).
    const records = readTraceLog({ path: target.path, limit });
    const data = { sessionId: target.sessionId, records };

    return createOutputResult(data, {
      plain: selectFormatter(ctx, showFormatters),
    });
  },
};

export default showCommand;
