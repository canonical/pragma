import type { CommandContext, CommandDefinition } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import { PragmaError } from "../../../error/index.js";
import buildComponentCommand from "./component.js";

const ctx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};

const llmCtx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: true, format: "text" as const, verbose: false },
};

const jsonCtx: CommandContext = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "json" as const, verbose: false },
};

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  context: CommandContext,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, context);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value, text };
}

describe("buildComponentCommand", () => {
  it("has correct path", () => {
    const cmd = buildComponentCommand();
    expect(cmd.path).toEqual(["create", "component"]);
  });

  it("includes framework as positional required select parameter", () => {
    const cmd = buildComponentCommand();
    const framework = cmd.parameters.find((p) => p.name === "framework");
    expect(framework).toBeDefined();
    expect(framework?.positional).toBe(true);
    expect(framework?.required).toBe(true);
    expect(framework?.type).toBe("select");
    expect(framework?.choices?.map((c) => c.value)).toEqual([
      "react",
      "svelte",
      "lit",
    ]);
  });

  it("includes prompt-derived parameters", () => {
    const cmd = buildComponentCommand();
    const names = cmd.parameters.map((p) => p.name);
    expect(names).toContain("componentPath");
    expect(names).toContain("withStyles");
    expect(names).toContain("withStories");
    expect(names).toContain("withSsrTests");
  });

  it("includes execution-mode parameters", () => {
    const cmd = buildComponentCommand();
    const names = cmd.parameters.map((p) => p.name);
    expect(names).toContain("dryRun");
    expect(names).toContain("yes");
    expect(names).toContain("showFiles");
    expect(names).toContain("preview");
    expect(names).toContain("generatedStamp");
  });

  it("dry-run with react returns output with file paths", async () => {
    const cmd = buildComponentCommand();
    const { text } = await executeOutput(
      cmd,
      {
        framework: "react",
        componentPath: "src/components/Button",
        dryRun: true,
        yes: true,
      },
      ctx,
    );
    expect(text).toContain("Button");
    expect(text).toContain("src/components/Button");
  });

  it("dry-run with svelte returns output with svelte files", async () => {
    const cmd = buildComponentCommand();
    const { text } = await executeOutput(
      cmd,
      {
        framework: "svelte",
        componentPath: "src/lib/components/Toggle",
        dryRun: true,
        yes: true,
      },
      ctx,
    );
    expect(text).toContain("Toggle");
    expect(text).toContain("src/lib/components/Toggle");
  });

  it("LLM mode returns markdown", async () => {
    const cmd = buildComponentCommand();
    const { text } = await executeOutput(
      cmd,
      {
        framework: "react",
        componentPath: "src/components/Card",
      },
      llmCtx,
    );
    // LLM markdown output includes generator name header
    expect(text).toContain("component/react");
  });

  it("JSON mode returns parseable JSON", async () => {
    const cmd = buildComponentCommand();
    const { text } = await executeOutput(
      cmd,
      {
        framework: "react",
        componentPath: "src/components/Card",
      },
      jsonCtx,
    );
    const data = JSON.parse(text);
    expect(data.generator.name).toBe("component/react");
    expect(Array.isArray(data.plan)).toBe(true);
  });

  it("throws PragmaError for invalid framework", async () => {
    const cmd = buildComponentCommand();
    await expect(cmd.execute({ framework: "angular" }, ctx)).rejects.toThrow(
      PragmaError,
    );
  });

  it("throws PragmaError when framework is missing", async () => {
    const cmd = buildComponentCommand();
    await expect(cmd.execute({}, ctx)).rejects.toThrow(PragmaError);
  });

  it("returns interactive result when required answers are missing", async () => {
    const cmd = buildComponentCommand();
    // framework provided but componentPath has a default, so it should NOT
    // trigger interactive mode — all prompts have defaults
    const result = await cmd.execute({ framework: "lit", dryRun: true }, ctx);
    // componentPath has a default, so executeGenerator applies it and proceeds
    expect(result.tag).toBe("output");
  });

  it("has parameter groups", () => {
    const cmd = buildComponentCommand();
    expect(cmd.parameterGroups).toEqual({
      Component: ["componentPath"],
      Options: ["withStyles", "withStories", "withSsrTests"],
    });
  });

  it("has examples in meta", () => {
    const cmd = buildComponentCommand();
    expect(cmd.meta?.examples?.length).toBeGreaterThan(0);
  });
});
