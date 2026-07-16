import { describe, expect, it } from "vitest";
import type { ToolSpec } from "../shared/ToolSpec.js";
import validatePromptDefinition from "./validatePromptDefinition.js";

const SPECS: ToolSpec[] = [
  {
    name: "thing_list",
    description: "List things.",
    params: {
      category: { type: "string", description: "Filter", optional: true },
    },
    readOnly: true,
    execute: async () => ({ data: [] }),
  },
  {
    name: "thing_write",
    description: "Write things.",
    readOnly: false,
    execute: async () => ({ data: {} }),
  },
  {
    name: "graph_query",
    description: "Raw SPARQL.",
    readOnly: true,
    execute: async () => ({ data: [] }),
  },
];

const VALID = {
  name: "do-thing",
  description: "Do the thing.",
  arguments: {
    focus: { description: "Focus area", required: true },
  },
  template: "Work on {{focus}}.",
  embed: [{ tool: "thing_list", heading: "Things" }],
};

describe("validatePromptDefinition", () => {
  it("accepts a valid definition", () => {
    const def = validatePromptDefinition(VALID, "test", SPECS);
    expect(def.name).toBe("do-thing");
    expect(def.embed).toHaveLength(1);
  });

  it("rejects a non-kebab-case name", () => {
    expect(() =>
      validatePromptDefinition({ ...VALID, name: "DoThing" }, "test", SPECS),
    ).toThrow(/kebab-case/);
  });

  it("rejects a bad argument name", () => {
    expect(() =>
      validatePromptDefinition(
        { ...VALID, arguments: { Focus: { description: "x" } } },
        "test",
        SPECS,
      ),
    ).toThrow(/argument name/);
  });

  it("rejects an embed of an unregistered tool", () => {
    expect(() =>
      validatePromptDefinition(
        { ...VALID, embed: [{ tool: "nope_list", heading: "X" }] },
        "test",
        SPECS,
      ),
    ).toThrow(/not a registered tool/);
  });

  it("rejects an embed of a non-read-only tool", () => {
    expect(() =>
      validatePromptDefinition(
        { ...VALID, embed: [{ tool: "thing_write", heading: "X" }] },
        "test",
        SPECS,
      ),
    ).toThrow(/not read-only/);
  });

  it("denies raw-query tools even though they are read-only", () => {
    for (const tool of ["graph_query", "graphql_run"]) {
      expect(() =>
        validatePromptDefinition(
          { ...VALID, embed: [{ tool, heading: "X" }] },
          "test",
          SPECS,
        ),
      ).toThrow(/raw query text/);
    }
  });

  it("rejects non-string embed arg values (splice sites are strings)", () => {
    expect(() =>
      validatePromptDefinition(
        {
          ...VALID,
          embed: [{ tool: "thing_list", args: { category: 5 }, heading: "X" }],
        },
        "test",
        SPECS,
      ),
    ).toThrow(/must be a string/);
  });

  it("rejects placeholders that name undeclared arguments", () => {
    expect(() =>
      validatePromptDefinition(
        { ...VALID, template: "Work on {{mystery}}." },
        "test",
        SPECS,
      ),
    ).toThrow(/undeclared argument/);
  });

  it("rejects a required argument that never splices anywhere", () => {
    expect(() =>
      validatePromptDefinition(
        { ...VALID, template: "No placeholder here." },
        "test",
        SPECS,
      ),
    ).toThrow(/never appears/);
  });

  it("accepts a required argument reachable only via an embed arg", () => {
    const def = validatePromptDefinition(
      {
        ...VALID,
        template: "No placeholder here.",
        embed: [
          {
            tool: "thing_list",
            args: { category: "{{focus}}" },
            heading: "Things",
          },
        ],
      },
      "test",
      SPECS,
    );
    expect(def.arguments?.focus?.required).toBe(true);
  });

  it("rejects an embed that sets both tool and resource", () => {
    expect(() =>
      validatePromptDefinition(
        {
          ...VALID,
          embed: [
            { tool: "thing_list", resource: "pragma://state", heading: "X" },
          ],
        },
        "test",
        SPECS,
      ),
    ).toThrow(/exactly one/);
  });

  it("allows pragma://state but no other pragma:// resource", () => {
    expect(() =>
      validatePromptDefinition(
        {
          ...VALID,
          embed: [{ resource: "pragma://config", heading: "X" }],
        },
        "test",
        SPECS,
      ),
    ).toThrow(/only pragma:\/\/state/);

    const def = validatePromptDefinition(
      {
        ...VALID,
        embed: [{ resource: "pragma://state", heading: "Scope" }],
      },
      "test",
      SPECS,
    );
    expect(def.embed).toEqual([
      { resource: "pragma://state", heading: "Scope" },
    ]);
  });

  it("validates completeFrom against the registered read-only tools", () => {
    expect(() =>
      validatePromptDefinition(
        {
          ...VALID,
          arguments: {
            focus: {
              description: "Focus",
              required: true,
              completeFrom: { tool: "thing_write", field: "name" },
            },
          },
        },
        "test",
        SPECS,
      ),
    ).toThrow(/read-only tool/);
  });

  it("rejects a non-positive budget", () => {
    expect(() =>
      validatePromptDefinition({ ...VALID, budget: 0 }, "test", SPECS),
    ).toThrow(/positive number/);
  });
});
