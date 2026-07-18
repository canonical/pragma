import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import { projectMcp } from "../../../testing/helpers/projectMcp.js";
import type { CapabilityModule, ParamSpec } from "../../spec/types.js";
import { buildZodSchema } from "./registerVerb.js";

const passthroughFormatters = {
  plain: (d: unknown) => String(d),
  llm: (d: unknown) => String(d),
  json: (d: unknown) => JSON.stringify(d),
};

describe("buildZodSchema (params → zod)", () => {
  const params: ParamSpec[] = [
    {
      kind: "string",
      name: "name",
      doc: "n",
      positional: true,
      required: true,
    },
    { kind: "boolean", name: "withHistory", doc: "h" },
    { kind: "enum", name: "mode", doc: "m", values: ["a", "b"] },
    { kind: "number", name: "count", doc: "c" },
    { kind: "string[]", name: "tags", doc: "t" },
  ];
  const schema = z.object(buildZodSchema(params));

  it("maps each param kind and keys by param name", () => {
    expect(Object.keys(buildZodSchema(params)).sort()).toEqual([
      "count",
      "mode",
      "name",
      "tags",
      "withHistory",
    ]);
  });

  it("makes non-required params optional but keeps required ones", () => {
    expect(schema.safeParse({ name: "x" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("validates enum, number, and array fields", () => {
    expect(schema.safeParse({ name: "x", mode: "z" }).success).toBe(false);
    expect(
      schema.safeParse({
        name: "x",
        mode: "a",
        count: 2,
        tags: ["p"],
        withHistory: true,
      }).success,
    ).toBe(true);
  });

  it("applies a declared default when the field is omitted (CLI parity)", () => {
    const withDefault = z.object(
      buildZodSchema([
        { kind: "string", name: "mode", doc: "m", default: "fast" },
      ]),
    );
    expect(withDefault.parse({})).toEqual({ mode: "fast" });
    expect(withDefault.parse({ mode: "slow" })).toEqual({ mode: "slow" });
  });
});

describe("tool error envelope parity", () => {
  it("wraps a thrown non-PragmaError as the INTERNAL_ERROR envelope", async () => {
    const boom: CapabilityModule = {
      name: "boom",
      verbs: [
        {
          path: ["boom", "go"],
          summary: "Throws a plain Error.",
          params: [],
          output: { formatters: passthroughFormatters },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: true },
          },
          run: async () => {
            throw new Error("kaboom");
          },
        },
      ],
    };
    const mcp = await projectMcp([boom]);
    const envelope = await mcp.callTool("boom_go");
    await mcp.cleanup();

    expect(envelope.ok).toBe(false);
    const error = envelope.error as { code: string; message: string };
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).toContain("kaboom");
  });
});

describe("tool registration", () => {
  it("names tools by path and excludes non-exposed verbs", async () => {
    const mcp = await projectMcp([fixtureModule]);
    const names = (await mcp.listTools()).map((t) => t.name).sort();
    await mcp.cleanup();
    expect(names).toEqual(["widget_list", "widget_make"]);
  });

  it("derives annotations from the capability", async () => {
    const mcp = await projectMcp([fixtureModule]);
    const tools = await mcp.listTools();
    await mcp.cleanup();
    expect(
      tools.find((t) => t.name === "widget_list")?.annotations,
    ).toMatchObject({ readOnlyHint: true, openWorldHint: false });
    expect(
      tools.find((t) => t.name === "widget_make")?.annotations,
    ).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    });
  });

  it("records a reason for a verb withheld from MCP", () => {
    const internal = fixtureModule.verbs.find((v) => v.path[1] === "internal");
    expect(internal?.capability.mcp).toEqual({
      expose: false,
      reason: "internal probe, not an agent tool",
    });
  });
});
