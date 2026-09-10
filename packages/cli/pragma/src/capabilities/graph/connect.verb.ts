/**
 * `graph connect <a> <b>` — what connects two entities, and what "unlinked"
 * means when nothing does.
 *
 * The third verb on the `graph` noun, beside `inspect` (one entity's
 * neighbourhood) and `query` (the raw SPARQL escape hatch). It belongs here for
 * the same reason those two do: it reads ACROSS the whole store rather than
 * within one population, so it hangs off the noun for a store-wide read and
 * adds no noun of its own.
 *
 * It is hand-written rather than a declared pack story because the pack grammar
 * cannot express it. A list story's parameters are exactly its declared filters
 * plus its declared search, every filter is projected as an OPTIONAL NAMED
 * flag, and the only positional-and-required parameter the compiler ever mints
 * is a lookup's single name — so there is nowhere in the grammar to put two
 * required entity arguments. And a filter is a row predicate over an author's
 * query, so a declared form would have to enumerate the walk space and let a
 * filter pick one pair out of it: at four hops that space is 71 million walks,
 * against the largest declared story's 1,698 rows.
 *
 * Both arguments accept exactly what `graph inspect` accepts — a prefixed name
 * or an absolute IRI — and complete from the pack index through the same
 * `names`/`index` source a compiled lookup's `<name>` uses, so the two
 * positionals behave like every other entity argument in the CLI.
 *
 * Store-backed and read-only, like both its siblings. The traversal lives in a
 * dynamically-imported run body: the relation index it needs is built by one
 * scan of the store, and a process that never asks a connect question must
 * never pay for it — which is the same guarantee `needsStore` and the lazy
 * store already give every other read.
 */

import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/index.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/index.js";
import { connectFormatters } from "./connect.render.js";
import type { ConnectResult } from "./connect.types.js";

/**
 * The hop limit in force unless `--hops` says otherwise.
 *
 * Four, from the measured connectivity ladder on the shipped pack: it is the
 * smallest limit that spans the longest genuine bridge in this store — the walk
 * from a platform variable through its declaration and its references to the
 * symbol behind it — and the largest that keeps the answer set honest. At three
 * that walk is refused; at six the connected fraction jumps and the paths stop
 * being something a person can hold in mind.
 */
export const DEFAULT_HOPS = 4;

/** The ceiling `--hops` may be raised to; above it the verb refuses. */
export const MAX_HOPS = 6;

/** How many shortest paths are shown unless `--paths` says otherwise. */
export const DEFAULT_PATHS = 10;

/**
 * Hold a numeric param to a whole number within its stated range.
 *
 * REFUSES rather than clamps. A clamped `--hops 40` would answer a question
 * nobody asked and report a limit the caller did not set, which is precisely
 * the hidden policy every answer's policy block exists to rule out.
 *
 * The kernel already coerces a `number` param and rejects what is not a number
 * at all (`project/cli/dispatch.ts#coerceParam`, and `z.number()` over MCP), so
 * what is left to check is RANGE and wholeness — `--hops 2.5` is a number, and
 * it is not a hop count.
 *
 * @param value - The coerced param value.
 * @param name - The flag's name, for the diagnostic.
 * @param fallback - The value when the flag was not given.
 * @param min - The smallest accepted value.
 * @param max - The largest accepted value, if there is one.
 * @returns The validated integer.
 * @throws PragmaError INVALID_INPUT when the value is not an integer in range.
 */
function bounded(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max?: number,
): number {
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  const ceiling = max === undefined ? "" : ` and at most ${max}`;
  if (
    !Number.isInteger(parsed) ||
    parsed < min ||
    (max !== undefined && parsed > max)
  ) {
    throw PragmaError.invalidInput(name, String(value), {
      recovery: {
        message: `--${name} must be a whole number of at least ${min}${ceiling}.`,
      },
    });
  }
  return parsed;
}

const connectVerb: VerbSpec<Record<string, unknown>, ConnectResult> = {
  path: ["graph", "connect"],
  summary: "Show the shortest relation paths between two entities.",
  doc: "Finds every shortest path of RELATION edges between two entities, and says which kind of nothing it found when there is no path. An edge counts as a relation only where it does not fan out into a roster — membership of a class, a tier or a family is answered by that noun's list verb, not by a path — so most pairs are correctly reported as unconnected. Address each endpoint by prefixed name (ds:global.component.button) or absolute IRI. Every answer states the hop limit, the fan-in threshold, and the packs searched.",
  params: [
    {
      kind: "string",
      name: "a",
      doc: "The first endpoint — a prefixed name or absolute IRI.",
      positional: true,
      required: true,
      complete: { kind: "names", source: { from: "index", type: "" } },
    },
    {
      kind: "string",
      name: "b",
      doc: "The second endpoint — a prefixed name or absolute IRI.",
      positional: true,
      required: true,
      complete: { kind: "names", source: { from: "index", type: "" } },
    },
    {
      kind: "number",
      name: "hops",
      doc: `Largest path length to return (default ${DEFAULT_HOPS}, ceiling ${MAX_HOPS}).`,
      default: DEFAULT_HOPS,
    },
    {
      kind: "number",
      name: "paths",
      doc: `Most shortest paths to show (default ${DEFAULT_PATHS}); the answer always reports the true total.`,
      default: DEFAULT_PATHS,
    },
  ],
  output: { formatters: connectFormatters },
  examples: [
    {
      cmd: `${BIN_NAME} graph connect ds:global.component.button dt:color.text`,
      note: "a block and a token symbol",
    },
    {
      cmd: `${BIN_NAME} graph connect ds:global.component.button ds:apps.pattern.data_table --format json`,
      note: "an honest unlinked answer, with the policy it was found under",
    },
  ],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (params: Record<string, unknown>, rt) =>
    import("./runConnect.js").then((m) =>
      m.runConnect(rt, String(params.a), String(params.b), {
        hops: bounded(params.hops, "hops", DEFAULT_HOPS, 1, MAX_HOPS),
        paths: bounded(params.paths, "paths", DEFAULT_PATHS, 1),
      }),
    ),
};

/** The `graph connect` verb. */
export const graphConnectVerb = asVerb(connectVerb);
