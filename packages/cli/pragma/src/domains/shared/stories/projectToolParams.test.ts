import { describe, expect, it } from "vitest";
import projectToolParams from "./projectToolParams.js";
import type { StoryParam } from "./types.js";

describe("projectToolParams", () => {
  it("drops CLI-only parameters", () => {
    const params: StoryParam[] = [
      { name: "a", type: "boolean", description: "a" },
      { name: "b", type: "boolean", description: "b", surfaces: "cli" },
      { name: "c", type: "boolean", description: "c", surfaces: "mcp" },
    ];
    expect(Object.keys(projectToolParams(params))).toEqual(["a", "c"]);
  });

  it("prefers the tool description and sets optional from required", () => {
    const params: StoryParam[] = [
      {
        name: "names",
        type: "string[]",
        description: "cli text",
        toolDescription: "mcp text",
        required: true,
      },
      { name: "flag", type: "boolean", description: "shared text" },
    ];
    const projected = projectToolParams(params);
    expect(projected.names).toEqual({
      type: "string[]",
      description: "mcp text",
      optional: false,
    });
    expect(projected.flag).toEqual({
      type: "boolean",
      description: "shared text",
      optional: true,
    });
  });

  it("carries enums through", () => {
    const params: StoryParam[] = [
      {
        name: "mode",
        type: "string",
        description: "mode",
        enum: ["fast", "slow"],
      },
    ];
    expect(projectToolParams(params).mode?.enum).toEqual(["fast", "slow"]);
  });
});
