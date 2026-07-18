/**
 * PROTECTED — MCP plan-first + confirm parity for `create`:
 * a tool call WITHOUT `confirm` returns a plan (`planOnly`/`confirmRequired`)
 * and writes nothing; WITH `confirm: true` it runs for real. The plan mirrors
 * the CLI `--dry-run` preview (both filter out Prompt effects).
 */

import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { createComponentVerb } from "./create.verb.js";
import { createModule } from "./index.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const freshCwd = (): string =>
  mkdtempSync(join(tmpdir(), "pragma2-create-mcp-"));

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe("create over MCP (PROTECTED)", () => {
  it("exposes create_component with non-read-only annotations", async () => {
    const dir = freshCwd();
    const mcp = await projectMcp([createModule], dir);
    cleanup = mcp.cleanup;
    const tools = await mcp.listTools();
    const component = tools.find((t) => t.name === "create_component");
    expect(component).toBeDefined();
    expect(component?.annotations).toMatchObject({
      readOnlyHint: false,
      openWorldHint: false,
    });
  });

  it("plan-first: no confirm → a plan, no files written", async () => {
    const dir = freshCwd();
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const mcp = await projectMcp([createModule], dir);
      cleanup = mcp.cleanup;
      const result = await mcp.callTool("create_component", {
        framework: "react",
        componentPath: "src/components/Button",
      });
      expect(result.ok).toBe(true);
      expect(result.meta).toMatchObject({
        planOnly: true,
        confirmRequired: true,
      });
      const plan = (result.data as { plan: string[] }).plan;
      expect(plan.some((line) => line.includes("Button.tsx"))).toBe(true);
      expect(plan.some((line) => line.includes("Prompt"))).toBe(false);
      expect(readdirSync(dir)).toEqual([]); // nothing written
    } finally {
      process.chdir(prev);
    }
  });

  it("confirm: true → runs for real and writes files", async () => {
    const dir = freshCwd();
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const mcp = await projectMcp([createModule], dir);
      cleanup = mcp.cleanup;
      const result = await mcp.callTool("create_component", {
        framework: "react",
        componentPath: "src/components/Button",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
        confirm: true,
      });
      expect(result.ok).toBe(true);
      expect(existsSync(join(dir, "src/components/Button/Button.tsx"))).toBe(
        true,
      );
    } finally {
      process.chdir(prev);
    }
  });

  it("the MCP plan matches the CLI --dry-run preview", async () => {
    const dir = freshCwd();
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const mcp = await projectMcp([createModule], dir);
      cleanup = mcp.cleanup;
      const mcpResult = await mcp.callTool("create_component", {
        framework: "react",
        componentPath: "src/components/Button",
        withStyles: false,
        withStories: false,
        withSsrTests: false,
      });
      const mcpPlan = (mcpResult.data as { plan: string[] }).plan;

      const cliOutcome = await executeVerb(
        createComponentVerb as VerbSpec,
        {
          framework: "react",
          componentPath: "src/components/Button",
          withStyles: false,
          withStories: false,
          withSsrTests: false,
        },
        { dryRun: true, undo: false, yes: false },
        bootRuntime(FLAGS, dir),
      );
      // Every planned effect line appears in the CLI dry-run preview too.
      for (const line of mcpPlan) {
        expect(cliOutcome.stdout ?? "").toContain(line);
      }
    } finally {
      process.chdir(prev);
    }
  });
});
