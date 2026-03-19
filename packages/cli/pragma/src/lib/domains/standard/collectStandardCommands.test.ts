import type { CommandContext, CommandOutputResult } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DS_ALL_TTL } from "../../../../testing/dsFixtures.js";
import { createTestStore } from "../../../../testing/store.js";
import { PragmaError } from "../../../error/index.js";
import collectStandardCommands from "./collectStandardCommands.js";

/**
 * Integration tests for standard CLI commands (D5).
 *
 * Uses a real ke store with test TTL data to validate
 * the full execute → format → CommandResult pipeline.
 */

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

function getCommands() {
  return collectStandardCommands({ store });
}

function findCommand(path: string[]) {
  const commands = getCommands();
  const cmd = commands.find(
    (c) =>
      c.path.length === path.length && c.path.every((s, i) => s === path[i]),
  );
  if (!cmd) throw new Error(`Command not found: ${path.join(" ")}`);
  return cmd;
}

function makeCtx(
  overrides?: Partial<CommandContext["globalFlags"]>,
): CommandContext {
  return {
    cwd: "/tmp",
    globalFlags: {
      llm: false,
      format: "text",
      verbose: false,
      ...overrides,
    },
  };
}

describe("collectStandardCommands", () => {
  it("returns three commands", () => {
    expect(getCommands().length).toBe(3);
  });

  it("registers standard list", () => {
    expect(findCommand(["standard", "list"])).toBeDefined();
  });

  it("registers standard get", () => {
    expect(findCommand(["standard", "get"])).toBeDefined();
  });

  it("registers standard categories", () => {
    expect(findCommand(["standard", "categories"])).toBeDefined();
  });
});

describe("standard list", () => {
  it("returns output result with all standards", async () => {
    const cmd = findCommand(["standard", "list"]);
    const result = await cmd.execute({}, makeCtx());
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("react/component/props");
    expect(text).toContain("code/function/purity");
  });

  it("filters by --category", async () => {
    const cmd = findCommand(["standard", "list"]);
    const result = await cmd.execute({ category: "react" }, makeCtx());
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("react/component/props");
    expect(text).not.toContain("code/function/purity");
  });

  it("filters by --search", async () => {
    const cmd = findCommand(["standard", "list"]);
    const result = await cmd.execute({ search: "folder" }, makeCtx());
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("react/component/folder-structure");
    expect(text).not.toContain("code/function/purity");
  });

  it("throws EMPTY_RESULTS for non-matching filter", async () => {
    const cmd = findCommand(["standard", "list"]);
    try {
      await cmd.execute({ category: "nonexistent" }, makeCtx());
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("EMPTY_RESULTS");
    }
  });

  it("renders LLM format with --llm", async () => {
    const cmd = findCommand(["standard", "list"]);
    const result = await cmd.execute({}, makeCtx({ llm: true }));
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## Standards");
    expect(text).toContain("**react/component/folder-structure**");
  });
});

describe("standard get", () => {
  it("returns summary by default", async () => {
    const cmd = findCommand(["standard", "get"]);
    const result = await cmd.execute(
      { name: "react/component/folder-structure" },
      makeCtx(),
    );
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("Category: react");
    expect(text).not.toContain("Do:");
  });

  it("returns dos and donts with --detailed", async () => {
    const cmd = findCommand(["standard", "get"]);
    const result = await cmd.execute(
      { name: "react/component/folder-structure", detailed: true },
      makeCtx(),
    );
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("Do:");
    expect(text).toContain("Don't:");
  });

  it("throws ENTITY_NOT_FOUND for unknown standard", async () => {
    const cmd = findCommand(["standard", "get"]);
    try {
      await cmd.execute({ name: "nonexistent" }, makeCtx());
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
    }
  });

  it("renders LLM format with --llm", async () => {
    const cmd = findCommand(["standard", "get"]);
    const result = await cmd.execute(
      { name: "react/component/folder-structure", detailed: true },
      makeCtx({ llm: true }),
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## react/component/folder-structure");
    expect(text).toContain("### Do");
  });

  it("renders JSON with --detailed", async () => {
    const cmd = findCommand(["standard", "get"]);
    const result = await cmd.execute(
      { name: "react/component/folder-structure", detailed: true },
      makeCtx({ format: "json" }),
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("react/component/folder-structure");
    expect(parsed.dos).toBeDefined();
    expect(parsed.donts).toBeDefined();
  });

  it("renders JSON without --detailed (omits dos/donts)", async () => {
    const cmd = findCommand(["standard", "get"]);
    const result = await cmd.execute(
      { name: "react/component/folder-structure" },
      makeCtx({ format: "json" }),
    );
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("react/component/folder-structure");
    expect(parsed.dos).toBeUndefined();
    expect(parsed.donts).toBeUndefined();
  });
});

describe("standard categories", () => {
  it("returns categories with counts", async () => {
    const cmd = findCommand(["standard", "categories"]);
    const result = await cmd.execute({}, makeCtx());
    expect(result.tag).toBe("output");

    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("react (2 standards)");
    expect(text).toContain("code (1 standard)");
  });

  it("renders LLM format with --llm", async () => {
    const cmd = findCommand(["standard", "categories"]);
    const result = await cmd.execute({}, makeCtx({ llm: true }));
    const output = result as CommandOutputResult;
    const text = output.render.plain(output.value);
    expect(text).toContain("## Standard Categories");
    expect(text).toContain("**react**");
  });
});
