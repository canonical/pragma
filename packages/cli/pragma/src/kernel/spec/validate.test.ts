import { describe, expect, it } from "vitest";
import { fixtureModule } from "../../testing/fixtures/fixtureCapability.js";
import type { CapabilityModule } from "./types.js";
import { validateModule } from "./validate.js";

describe("validateModule", () => {
  it("accepts a well-formed module", () => {
    expect(() => validateModule(fixtureModule)).not.toThrow();
  });

  it("rejects a verb with a bad param kind", () => {
    const bad = {
      name: "bad",
      verbs: [
        {
          path: ["x", "y"],
          summary: "x",
          params: [{ kind: "float", name: "n", doc: "d" }],
          output: {
            formatters: { plain: () => "", llm: () => "", json: () => "" },
          },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: true },
          },
          run: async () => null,
        },
      ],
    } as unknown as CapabilityModule;
    expect(() => validateModule(bad)).toThrow(
      /invalid capability module "bad"/,
    );
  });

  it("rejects an expose:false verb missing its reason", () => {
    const bad = {
      name: "noreason",
      verbs: [
        {
          path: ["x"],
          summary: "x",
          params: [],
          output: {
            formatters: { plain: () => "", llm: () => "", json: () => "" },
          },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: false },
          },
          run: async () => null,
        },
      ],
    } as unknown as CapabilityModule;
    expect(() => validateModule(bad)).toThrow();
  });

  it("rejects a run that is not a function", () => {
    const bad = {
      name: "notfn",
      verbs: [
        {
          path: ["x"],
          summary: "x",
          params: [],
          output: {
            formatters: { plain: () => "", llm: () => "", json: () => "" },
          },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: true },
          },
          run: "nope",
        },
      ],
    } as unknown as CapabilityModule;
    expect(() => validateModule(bad)).toThrow();
  });
});
