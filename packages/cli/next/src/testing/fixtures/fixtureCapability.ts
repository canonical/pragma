/**
 * A synthetic capability module used only by tests (D8 — never listed in
 * `src/capabilities/index.ts`). It exercises every emit path: a read verb, a
 * mutating verb with a positional + a camelCase flag, and a hidden verb the
 * emitter must drop.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, gen, succeed, writeFile } from "@canonical/task";
import type { CapabilityModule } from "../../kernel/spec/types.js";

/** A synthetic module: noun `widget`, three verbs (one hidden). */
export const fixtureModule: CapabilityModule = {
  name: "fixture",
  verbs: [
    {
      path: ["widget", "list"],
      summary: "List widgets.",
      params: [],
      output: {
        formatters: {
          plain: (d) => String(d),
          llm: (d) => String(d),
          json: (d) => JSON.stringify(d),
        },
      },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: {
          expose: true,
          annotations: { readOnlyHint: true, openWorldHint: false },
        },
      },
      run: async () => ["alpha", "beta"],
    },
    {
      path: ["widget", "make"],
      summary: "Make a widget.",
      params: [
        {
          kind: "string",
          name: "name",
          doc: "Widget name.",
          positional: true,
          required: true,
        },
        { kind: "boolean", name: "withHistory", doc: "Seed history." },
      ],
      output: {
        formatters: {
          plain: (d) => String(d),
          llm: (d) => String(d),
          json: (d) => JSON.stringify(d),
        },
      },
      capability: {
        needsStore: true,
        mutates: true,
        destructive: true,
        mcp: {
          expose: true,
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: false,
          },
        },
      },
      run: () => succeed({ made: true }),
    },
    {
      path: ["widget", "internal"],
      summary: "Internal probe.",
      hidden: true,
      params: [],
      output: {
        formatters: {
          plain: (d) => String(d),
          llm: (d) => String(d),
          json: (d) => JSON.stringify(d),
        },
      },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: { expose: false, reason: "internal probe, not an agent tool" },
      },
      run: async () => "ok",
    },
  ],
};

/**
 * The isolated tmp path the fixture `touch` verb writes to. Rooted under
 * `$XDG_STATE_HOME` so the XDG isolation setup contains it per test run.
 *
 * @param name - The file name to create.
 * @returns The absolute path under the isolated state directory.
 */
export function touchPath(name: string): string {
  const base = process.env.XDG_STATE_HOME ?? tmpdir();
  return join(base, "pragma-touch", name);
}

const passthroughFormatters = {
  plain: (d: unknown) => String(d),
  llm: (d: unknown) => String(d),
  json: (d: unknown) => JSON.stringify(d),
};

/**
 * A second synthetic module exercising the effect seam end-to-end: a read verb
 * (`probe echo`) that returns its input, and a mutating Task verb (`probe
 * touch`) that writes a file under the isolated tmp. Used by the CLI/MCP
 * projector tests for envelope parity and MCP plan-first/confirm. Test-only
 * (D8) — never listed in `capabilities/index.ts`.
 */
export const fixtureEffectsModule: CapabilityModule = {
  name: "fixture-effects",
  verbs: [
    {
      path: ["probe", "echo"],
      summary: "Echo the message back.",
      params: [
        {
          kind: "string",
          name: "message",
          doc: "The message to echo.",
          positional: true,
          required: true,
        },
      ],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: {
          expose: true,
          annotations: { readOnlyHint: true, openWorldHint: false },
        },
      },
      run: async (p) => ({ echoed: (p as { message: string }).message }),
    },
    {
      path: ["probe", "touch"],
      summary: "Create a file under the isolated tmp.",
      params: [
        {
          kind: "string",
          name: "name",
          doc: "File name to create.",
          positional: true,
          required: true,
        },
      ],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: false,
        mutates: true,
        mcp: {
          expose: true,
          annotations: { readOnlyHint: false, openWorldHint: false },
        },
      },
      run: (p) =>
        gen(function* () {
          const name = (p as { name: string }).name;
          yield* $(writeFile(touchPath(name), "touched\n"));
          return { touched: name };
        }),
    },
  ],
};

/**
 * A synthetic module that exercises every RENDER path of `emitReference` (D8 —
 * never listed in `src/capabilities/index.ts`). Distinct from `fixtureModule`,
 * which only exercises `emitSurface`: this one carries the doc-only shapes the
 * reference generator reads and the machine surface ignores — a rich `doc`,
 * examples with and without notes, a {@link DisclosureSpec}, every param kind
 * as a flag (including a repeatable `string[]` flag), an OPTIONAL variadic
 * positional, a destructive mutation, a visible MCP-withheld verb, a self-verb,
 * and a hidden verb the emitter must drop.
 */
export const fixtureReferenceModule: CapabilityModule = {
  name: "fixture-reference",
  verbs: [
    {
      path: ["gizmo", "scan"],
      summary: "Scan the gizmos.",
      doc: "Scan every gizmo under the active scope, optionally narrowing to named targets. Reads nothing off disk.",
      params: [
        {
          kind: "string[]",
          name: "targets",
          doc: "Gizmo names to scan (all when omitted).",
          positional: true,
        },
        {
          kind: "enum",
          name: "mode",
          doc: "Scan mode.",
          values: ["fast", "slow"],
          default: "fast",
        },
        { kind: "number", name: "limit", doc: "Maximum gizmos to scan." },
        { kind: "string", name: "label", doc: "Label to stamp on the report." },
        { kind: "string[]", name: "include", doc: "Extra globs to include." },
        { kind: "boolean", name: "deep", doc: "Recurse into sub-gizmos." },
      ],
      output: { formatters: passthroughFormatters },
      examples: [
        { cmd: "pragma gizmo scan", note: "scan everything" },
        { cmd: "pragma gizmo scan alpha --mode slow" },
      ],
      disclosure: { levels: ["summary", "detailed"], default: "summary" },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: {
          expose: true,
          annotations: { readOnlyHint: true, openWorldHint: false },
        },
      },
      run: async () => ({ scanned: true }),
    },
    {
      path: ["gizmo", "wipe"],
      summary: "Wipe a gizmo.",
      params: [
        {
          kind: "string",
          name: "path",
          doc: "The gizmo path to wipe.",
          positional: true,
          required: true,
        },
      ],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: true,
        mutates: true,
        destructive: true,
        mcp: {
          expose: true,
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: false,
          },
        },
      },
      run: () => succeed({ wiped: true }),
    },
    {
      path: ["gizmo", "local"],
      summary: "A visible gizmo verb withheld from MCP.",
      params: [],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: { expose: false, reason: "CLI-only local helper" },
      },
      run: async () => ({ local: true }),
    },
    {
      path: ["ping"],
      summary: "Ping the gizmo host.",
      params: [],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: {
          expose: true,
          annotations: { readOnlyHint: true, openWorldHint: false },
        },
      },
      run: async () => ({ pong: true }),
    },
    {
      path: ["gizmo", "hidden"],
      summary: "Hidden gizmo probe.",
      hidden: true,
      params: [],
      output: { formatters: passthroughFormatters },
      capability: {
        needsStore: false,
        mutates: false,
        mcp: { expose: false, reason: "internal probe" },
      },
      run: async () => ({ ok: true }),
    },
  ],
};
