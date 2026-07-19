import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listPromptSummaries } from "../../kernel/project/mcp/prompts/source.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/spec/types.js";
import { CANONICAL_TTL } from "../../testing/fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import type { McpHarness } from "../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

/** The 5 authored prompt names (rdfs:label), sorted. */
const EXPECTED = [
  "audit-standards",
  "build-a-block",
  "configure",
  "explore-design-system",
  "scaffold-component",
];

let fixture: FixtureGraph;
let mcp: McpHarness;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL });
  mcp = await projectMcp(capabilities, fixture.cwd);
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

describe("prompt content noun — prompt_list / prompt_lookup (PROTECTED)", () => {
  it("prompt_list resolves the authored ds:Prompt entities", async () => {
    const result = await mcp.callTool("prompt_list");
    const data = result.data as {
      prompts: { name: string; arguments: unknown[] }[];
    };
    expect(data.prompts.map((p) => p.name).sort()).toEqual(EXPECTED);
  });

  it("prompt_lookup returns the body + arguments of one prompt", async () => {
    const result = await mcp.callTool("prompt_lookup", {
      name: "build-a-block",
    });
    const data = result.data as {
      name: string;
      body: string;
      arguments: { name: string; required?: boolean }[];
    };
    expect(data.name).toBe("build-a-block");
    expect(data.body).toContain("{{blockName}}");
    expect(data.arguments.map((a) => a.name)).toContain("blockName");
  });

  it("prompt_lookup on a required-arg prompt reports the requirement", async () => {
    const result = await mcp.callTool("prompt_lookup", {
      name: "scaffold-component",
    });
    const data = result.data as {
      arguments: { name: string; required?: boolean }[];
    };
    const componentName = data.arguments.find(
      (a) => a.name === "componentName",
    );
    expect(componentName?.required).toBe(true);
  });

  it("prompt_lookup on an unknown name errors with suggestions", async () => {
    const result = await mcp.callTool("prompt_lookup", { name: "nope" });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string };
    expect(error.code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("prompt — native MCP prompts surface (PROTECTED)", () => {
  it("prompts/list is non-empty, each with a description", async () => {
    const prompts = await mcp.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(EXPECTED);
    for (const prompt of prompts) {
      expect(prompt.description, prompt.name).toBeTruthy();
    }
  });

  it("prompts/get returns the body store-backed, with arguments filled", async () => {
    const result = await mcp.getPrompt("build-a-block", {
      blockName: "Button",
    });
    const first = result.messages[0] as {
      content: { type: string; text: string };
    };
    expect(first.content.text).toContain("Button");
    expect(first.content.text).not.toContain("{{blockName}}");
  });

  it("prompts/get on an unknown name throws", async () => {
    await expect(mcp.getPrompt("nope")).rejects.toThrow();
  });
});

describe("prompt — storeless native listing (PROTECTED)", () => {
  it("listing the prompts does NOT boot the store", async () => {
    const runtime = bootRuntime(FLAGS, fixture.cwd);
    const summaries = listPromptSummaries(runtime);
    expect(summaries.map((s) => s.name).sort()).toEqual(EXPECTED);
    expect(runtime.store.booted).toBe(false);
  });
});
