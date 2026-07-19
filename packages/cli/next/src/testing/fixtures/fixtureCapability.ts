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
