import { describe, expect, it } from "vitest";
import projectCliParameters from "./projectCliParameters.js";
import type { StoryParam } from "./types.js";

describe("projectCliParameters", () => {
  it("drops MCP-only parameters", () => {
    const params: StoryParam[] = [
      { name: "a", type: "boolean", description: "a" },
      { name: "b", type: "boolean", description: "b", surfaces: "mcp" },
      { name: "c", type: "boolean", description: "c", surfaces: "cli" },
    ];
    expect(projectCliParameters(params).map((p) => p.name)).toEqual(["a", "c"]);
  });

  it("maps string[] to multiselect and enum strings to select with choices", () => {
    const params: StoryParam[] = [
      { name: "names", type: "string[]", description: "names" },
      {
        name: "mode",
        type: "string",
        description: "mode",
        enum: ["fast", "slow"],
      },
    ];
    const projected = projectCliParameters(params);
    expect(projected.at(0)?.type).toBe("multiselect");
    expect(projected.at(1)?.type).toBe("select");
    expect(projected.at(1)?.choices).toEqual([
      { label: "fast", value: "fast" },
      { label: "slow", value: "slow" },
    ]);
  });

  it("carries defaults, positionals, required, and completion through", async () => {
    const complete = async () => ["x"];
    const params: StoryParam[] = [
      {
        name: "prefix",
        type: "string",
        description: "prefix",
        positional: true,
        required: true,
        default: "ds",
        complete,
      },
    ];
    const projected = projectCliParameters(params);
    const first = projected.at(0);
    expect(first?.positional).toBe(true);
    expect(first?.required).toBe(true);
    expect(first?.default).toBe("ds");
    await expect(
      first?.complete?.("d", {
        cwd: "/",
        globalFlags: { llm: false, format: "text", verbose: false },
      }),
    ).resolves.toEqual(["x"]);
  });
});
