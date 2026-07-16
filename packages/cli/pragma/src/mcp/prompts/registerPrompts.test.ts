import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMcpClient } from "#testing";

let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const result = await createTestMcpClient();
  client = result.client;
  cleanup = result.cleanup;
});

afterAll(async () => {
  await cleanup();
});

describe("prompts/list", () => {
  it("serves the bundled v1 catalog", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toEqual([
      "implement-component",
      "audit-code",
      "explore-graph",
      "fix-empty-results",
    ]);
  });

  it("projects declared arguments with required flags", async () => {
    const { prompts } = await client.listPrompts();
    const implement = prompts.find((p) => p.name === "implement-component");
    expect(implement?.arguments).toEqual([
      {
        name: "component",
        description: "Component name (e.g. Button)",
        required: true,
      },
    ]);

    const fix = prompts.find((p) => p.name === "fix-empty-results");
    expect(fix?.arguments).toBeUndefined();
  });
});

describe("prompts/get", () => {
  it("hydrates implement-component with the block spec embedded", async () => {
    const result = await client.getPrompt({
      name: "implement-component",
      arguments: { component: "Button" },
    });

    expect(result.description).toContain("design-system component");
    expect(result.messages).toHaveLength(1);
    const message = result.messages[0];
    expect(message?.role).toBe("user");
    const text = (message?.content as { text: string }).text;
    expect(text).toContain("You are implementing the Button component");
    expect(text).toContain("## Component spec");
    expect(text).toContain("Button");
    expect(text).toContain("## Active scope");
  });

  it("hydrates fix-empty-results with the live state", async () => {
    const result = await client.getPrompt({ name: "fix-empty-results" });
    const text = (result.messages[0]?.content as { text: string }).text;
    expect(text).toContain("allTiers: true");
    expect(text).toContain("## Active scope");
    expect(text).toContain('"state"');
  });

  it("rejects a missing required argument at the protocol layer", async () => {
    await expect(
      client.getPrompt({ name: "implement-component", arguments: {} }),
    ).rejects.toThrow();
  });

  it("surfaces a nonexistent component through the lookup error envelope", async () => {
    // block_lookup batches per-name errors into its data payload rather
    // than throwing, so the section renders with the typed error inside —
    // the template survives and the agent sees suggestions.
    const result = await client.getPrompt({
      name: "implement-component",
      arguments: { component: "NoSuchThing" },
    });
    const text = (result.messages[0]?.content as { text: string }).text;
    expect(text).toContain("You are implementing the NoSuchThing component");
    expect(text).toContain("## Component spec");
    expect(text).toContain("ENTITY_NOT_FOUND");
  });
});

describe("completion/complete", () => {
  it("completes the component argument from block names", async () => {
    const result = await client.complete({
      ref: { type: "ref/prompt", name: "implement-component" },
      argument: { name: "component", value: "B" },
    });

    expect(result.completion.values).toContain("Button");
    for (const value of result.completion.values) {
      expect(value.startsWith("B")).toBe(true);
    }
  });

  it("returns no values for an argument without completeFrom", async () => {
    const result = await client.complete({
      ref: { type: "ref/prompt", name: "audit-code" },
      argument: { name: "category", value: "re" },
    });

    expect(result.completion.values).toEqual([]);
  });
});
