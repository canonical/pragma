/**
 * A synthetic capability module used only by tests (D8 — never listed in
 * `src/capabilities/index.ts`). It exercises every emit path: a read verb, a
 * mutating verb with a positional + a camelCase flag, and a hidden verb the
 * emitter must drop.
 */

import { succeed } from "@canonical/task";
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
