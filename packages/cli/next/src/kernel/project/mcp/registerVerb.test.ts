import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import { projectMcp } from "../../../testing/helpers/projectMcp.js";
import type { ParamSpec } from "../../spec/types.js";
import { buildZodSchema } from "./registerVerb.js";

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
