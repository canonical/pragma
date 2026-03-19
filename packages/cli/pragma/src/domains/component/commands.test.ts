import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../testing/dsFixtures.js";
import { createTestStore } from "../../../testing/store.js";
import { PragmaError } from "../../error/index.js";
import type { ComponentSummary, FilterConfig } from "../shared/types.js";
import buildComponentCommands from "./commands.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

const prereleaseConfig: FilterConfig = {
  tier: undefined,
  channel: "prerelease",
};

const ctx = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "text" as const, verbose: false },
};
const llmCtx = {
  cwd: "/tmp",
  globalFlags: { llm: true, format: "text" as const, verbose: false },
};
const jsonCtx = {
  cwd: "/tmp",
  globalFlags: { llm: false, format: "json" as const, verbose: false },
};

function findCommand(
  commands: CommandDefinition[],
  path: string,
): CommandDefinition {
  const cmd = commands.find((c) => c.path.join(" ") === path);
  if (!cmd) throw new Error(`Command "${path}" not found`);
  return cmd;
}

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  context: typeof ctx,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, context);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value, text };
}

describe("component list command", () => {
  it("returns output result with component data", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const listCmd = findCommand(commands, "component list");

    const { value } = await executeOutput(listCmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("Card");
  });

  it("renders plain text output", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const listCmd = findCommand(commands, "component list");

    const { text } = await executeOutput(listCmd, {}, ctx);
    expect(text).toContain("Button");
    expect(text).toContain("Card");
  });

  it("renders LLM markdown", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const listCmd = findCommand(commands, "component list");

    const { text } = await executeOutput(listCmd, {}, llmCtx);
    expect(text).toContain("## Components");
    expect(text).toContain("**Button**");
  });

  it("renders JSON output", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const listCmd = findCommand(commands, "component list");

    const { text } = await executeOutput(listCmd, {}, jsonCtx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c: ComponentSummary) => c.name === "Button")).toBe(
      true,
    );
  });

  it("respects tier filter from config", async () => {
    const commands = buildComponentCommands(store, {
      tier: "global",
      channel: "normal",
    });
    const listCmd = findCommand(commands, "component list");

    const { value } = await executeOutput(listCmd, {}, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).not.toContain("LXD Panel");
  });

  it("--all-tiers ignores tier filter", async () => {
    const commands = buildComponentCommands(store, {
      tier: "global",
      channel: "prerelease",
    });
    const listCmd = findCommand(commands, "component list");

    const { value } = await executeOutput(listCmd, { allTiers: true }, ctx);
    const names = (value as ComponentSummary[]).map((c) => c.name);
    expect(names).toContain("Button");
    expect(names).toContain("LXD Panel");
  });

  it("returns results with combined tier + channel", async () => {
    const emptyConfig: FilterConfig = { tier: "apps/lxd", channel: "normal" };
    const commands = buildComponentCommands(store, emptyConfig);
    const listCmd = findCommand(commands, "component list");

    const result = await listCmd.execute({}, ctx);
    // With lxd tier and normal channel, we get Button, Card, and LXD Panel
    expect(result.tag).toBe("output");
  });
});

describe("component get command", () => {
  it("returns summary by default", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(getCmd, { name: "Button" }, ctx);
    expect(text).toContain("Button");
    expect(text).toContain("global");
  });

  it("returns detailed view with --detailed", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(
      getCmd,
      { name: "Button", detailed: true },
      ctx,
    );
    expect(text).toContain("Button");
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
  });

  it("shows only selected aspects (--modifiers)", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(
      getCmd,
      { name: "Button", modifiers: true },
      ctx,
    );
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
    // Should NOT contain other aspects when only --modifiers is set
    expect(text).not.toContain("Tokens");
  });

  it("composes aspect flags (--modifiers --tokens)", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(
      getCmd,
      { name: "Button", modifiers: true, tokens: true },
      ctx,
    );
    expect(text).toContain("Modifiers");
    expect(text).toContain("Tokens");
  });

  it("renders LLM markdown for get", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(getCmd, { name: "Button" }, llmCtx);
    expect(text).toContain("## Button");
    expect(text).toContain("Tier: global");
  });

  it("renders JSON for get", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(getCmd, { name: "Button" }, jsonCtx);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.tier).toBe("global");
  });

  it("renders JSON with detailed aspects", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    const { text } = await executeOutput(
      getCmd,
      { name: "Button", detailed: true },
      jsonCtx,
    );
    const parsed = JSON.parse(text);
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeDefined();
  });

  it("throws ENTITY_NOT_FOUND for unknown component", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    await expect(getCmd.execute({ name: "NonExistent" }, ctx)).rejects.toThrow(
      PragmaError,
    );

    try {
      await getCmd.execute({ name: "NonExistent" }, ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
      expect((e as PragmaError).recovery).toContain("pragma component list");
    }
  });

  it("throws INVALID_INPUT for empty name", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");

    await expect(getCmd.execute({ name: "" }, ctx)).rejects.toThrow(
      PragmaError,
    );

    try {
      await getCmd.execute({ name: "" }, ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("provides tab completion candidates", async () => {
    const commands = buildComponentCommands(store, prereleaseConfig);
    const getCmd = findCommand(commands, "component get");
    const nameParam = getCmd.parameters.find((p) => p.name === "name");
    expect(nameParam?.complete).toBeDefined();

    if (nameParam?.complete) {
      const candidates = await nameParam.complete("Bu", ctx);
      expect(candidates).toContain("Button");
    }
  });
});
