import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { capabilities } from "../../../../capabilities/index.js";
import type { McpHarness } from "../../../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../../../testing/helpers/projectMcp.js";
import type { CapabilityModule } from "../../../spec/types.js";
import { buildInstructions, INSTRUCTIONS_MAX_CHARS } from "../instructions.js";
import { fillTemplate, promptProvider } from "./provider.js";

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-prompts-"));

/** A synthetic module that installs the native prompt surface (commit 3 wires
 * the real prompt module; commit 2 proves the hook mechanism in isolation). */
const promptHostModule: CapabilityModule = {
  name: "test-prompt-host",
  verbs: [],
  mcpPrompts: promptProvider,
};

let harness: McpHarness | undefined;
afterEach(async () => {
  await harness?.cleanup();
  harness = undefined;
});

describe("instructions — handshake orientation (PROTECTED)", () => {
  it("is present, non-empty, mentions capabilities + the discovery flow", () => {
    const text = buildInstructions(capabilities);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("capabilities");
    expect(text.toLowerCase()).toContain("discovery sequence");
  });

  it("stays under the length ceiling (cannot bloat)", () => {
    expect(buildInstructions(capabilities).length).toBeLessThanOrEqual(
      INSTRUCTIONS_MAX_CHARS,
    );
  });

  it("derives its conventions from the shared catalog source", () => {
    // The system convention string is authored once (capabilities/catalog.ts);
    // instructions must carry it verbatim so the two can never diverge.
    expect(buildInstructions(capabilities)).toContain(
      "design-system knowledge graph",
    );
  });
});

describe("MCP handshake — capabilities advertised (PROTECTED)", () => {
  it("advertises tools, resources, AND prompts", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const caps = harness.serverCapabilities();
    expect(caps?.tools).toBeDefined();
    expect(caps?.resources).toBeDefined();
    expect(caps?.prompts).toBeDefined();
  });

  it("sends the instructions string at initialize", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const instructions = harness.instructions();
    expect(instructions).toBeDefined();
    expect(instructions).toContain("capabilities");
  });

  it("lists zero prompts without a store when no prompt entities exist", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const prompts = await harness.listPrompts();
    expect(prompts).toEqual([]);
  });
});

describe("fillTemplate — argument substitution", () => {
  it("replaces {{arg}} placeholders and leaves unknowns intact", () => {
    expect(
      fillTemplate("Build {{name}} in {{framework}}", { name: "Button" }),
    ).toBe("Build Button in {{framework}}");
  });

  it("returns the body unchanged when no arguments are given", () => {
    expect(fillTemplate("static body", undefined)).toBe("static body");
  });
});
