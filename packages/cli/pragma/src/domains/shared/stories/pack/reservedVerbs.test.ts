import { describe, expect, it } from "vitest";
import {
  buildReservedVerbs,
  isReserved,
  nounVerbFromPath,
  nounVerbFromToolName,
} from "./reservedVerbs.js";

describe("nounVerbFromPath", () => {
  it("splits a [noun, verb] path", () => {
    expect(nounVerbFromPath(["standard", "list"])).toEqual([
      "standard",
      "list",
    ]);
  });

  it("treats a single-segment path as a whole-noun reservation", () => {
    expect(nounVerbFromPath(["info"])).toEqual(["info", undefined]);
  });

  it("preserves the hyphenated multi-word built-in verb", () => {
    expect(nounVerbFromPath(["tokens", "add-config"])).toEqual([
      "tokens",
      "add-config",
    ]);
  });
});

describe("nounVerbFromToolName", () => {
  it("splits a single-underscore tool name", () => {
    expect(nounVerbFromToolName("standard_list")).toEqual(["standard", "list"]);
  });

  it("keeps every segment after the first for multi-underscore names", () => {
    expect(nounVerbFromToolName("tokens_add_config")).toEqual([
      "tokens",
      "add_config",
    ]);
  });

  it("treats a single-token name as a whole-noun reservation", () => {
    expect(nounVerbFromToolName("info")).toEqual(["info", undefined]);
  });
});

describe("buildReservedVerbs", () => {
  // Mirrors the real built-in CLI command paths (pinned by
  // collectCommands.test.ts's golden snapshot).
  const CLI_PATHS: readonly (readonly string[])[] = [
    ["standard", "list"],
    ["standard", "lookup"],
    ["standard", "categories"],
    ["standard", "sample"],
    ["token", "list"],
    ["token", "lookup"],
    ["token", "sample"],
    ["tokens", "add-config"],
    ["config", "show"],
    ["config", "tier"],
    ["config", "channel"],
    ["info"],
    ["llm"],
    ["doctor"],
    ["capabilities"],
  ];

  // Mirrors the real built-in MCP tool names (pinned by registerTools.test.ts).
  const MCP_NAMES: readonly string[] = [
    "standard_list",
    "standard_lookup",
    "standard_categories",
    "standard_sample",
    "token_list",
    "token_lookup",
    "token_sample",
    "tokens_add_config",
    "info",
    "llm",
  ];

  it("assembles verb sets per noun from real CLI command paths", () => {
    const reserved = buildReservedVerbs(
      CLI_PATHS.map((path) => nounVerbFromPath(path)),
    );

    expect(reserved.get("standard")).toEqual(
      new Set(["list", "lookup", "categories", "sample"]),
    );
    expect(reserved.get("token")).toEqual(
      new Set(["list", "lookup", "sample"]),
    );
    expect(reserved.get("tokens")).toEqual(new Set(["add-config"]));
    expect(reserved.get("info")).toEqual(new Set(["*"]));
  });

  it("assembles verb sets per noun from real MCP tool names", () => {
    const reserved = buildReservedVerbs(
      MCP_NAMES.map((name) => nounVerbFromToolName(name)),
    );

    expect(reserved.get("standard")).toEqual(
      new Set(["list", "lookup", "categories", "sample"]),
    );
    // The token/tokens split plus underscore verb is harmless surface skew.
    expect(reserved.get("tokens")).toEqual(new Set(["add_config"]));
    expect(reserved.get("info")).toEqual(new Set(["*"]));
  });

  it("keeps both entries when a noun has a concrete verb and a bare form", () => {
    const reserved = buildReservedVerbs([
      ["config", "show"],
      ["config", undefined],
    ]);

    expect(reserved.get("config")).toEqual(new Set(["show", "*"]));
  });
});

describe("isReserved", () => {
  const reserved = buildReservedVerbs(
    (
      [
        ["standard", "list"],
        ["standard", "lookup"],
        ["standard", "categories"],
        ["standard", "sample"],
        ["config", "show"],
        ["info"],
      ] as const
    ).map((path) => nounVerbFromPath(path)),
  );

  it("reserves a verb the built-in noun owns", () => {
    expect(isReserved(reserved, "standard", "list")).toBe(true);
  });

  it("admits a new verb on an existing noun (per-verb relaxation)", () => {
    expect(isReserved(reserved, "standard", "foo")).toBe(false);
  });

  it("reserves every verb of a whole-noun (`*`) reservation", () => {
    expect(isReserved(reserved, "info", "list")).toBe(true);
  });

  it("does not reserve an unowned verb of a partially reserved noun", () => {
    expect(isReserved(reserved, "config", "list")).toBe(false);
  });

  it("does not reserve a noun with no built-in", () => {
    expect(isReserved(reserved, "recipe", "list")).toBe(false);
  });
});
