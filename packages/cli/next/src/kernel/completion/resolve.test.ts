import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completionFixture,
  fixtureEntityReader,
} from "../../testing/fixtures/completionFixture.js";
import { buildCompletionModel } from "./model.js";
import { parseWords } from "./parse.js";
import { resolveRequest } from "./resolve.js";
import type {
  CompletionEnv,
  CompletionRequest,
  CompletionSource,
} from "./types.js";

const model = buildCompletionModel([completionFixture]);
const env: CompletionEnv = { entities: fixtureEntityReader };
const emptyEnv: CompletionEnv = { entities: { names: () => [] } };

/** A flag-value request with the given source and partial. */
function valueRequest(
  source: CompletionSource,
  partial: string,
): CompletionRequest {
  return { context: { kind: "flag-value", flag: "--x", source }, partial };
}

/** Parse + resolve in one step against the fixture model. */
async function complete(
  words: readonly string[],
  environment: CompletionEnv = env,
): Promise<string[]> {
  return resolveRequest(parseWords(words, model), model, environment);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("resolveRequest — structural contexts (PROTECTED)", () => {
  it("resolves nouns by case-sensitive prefix", async () => {
    await expect(complete(["blo"])).resolves.toEqual(["block"]);
    await expect(complete([""])).resolves.toEqual([
      "block",
      "mcp",
      "standard",
      "status",
    ]);
    await expect(complete(["BLO"])).resolves.toEqual([]);
  });

  it("resolves verbs of the scanned noun", async () => {
    await expect(complete(["block", ""])).resolves.toEqual([
      "diff",
      "get",
      "list",
      "remove",
    ]);
    await expect(complete(["block", "ge"])).resolves.toEqual(["get"]);
  });

  it("resolves flag names, deduped and sorted by prefix filter", async () => {
    await expect(complete(["block", "get", "--v"])).resolves.toEqual([
      "--verbose",
      "--view",
    ]);
  });
});

describe("resolveRequest — source table (PROTECTED)", () => {
  it("values: ranks the enum values", async () => {
    await expect(
      resolveRequest(
        valueRequest({ kind: "values", values: ["anatomy", "full"] }, "a"),
        model,
        env,
      ),
    ).resolves.toEqual(["anatomy"]);
    await expect(complete(["block", "get", "--view", ""])).resolves.toEqual([
      "anatomy",
      "full",
      "summary",
    ]);
  });

  it("entity: ranks names from the reader (exact > prefix > substring)", async () => {
    await expect(complete(["block", "get", "button"])).resolves.toEqual([
      "button",
      "button-group",
    ]);
    await expect(complete(["block", "get", "tool"])).resolves.toEqual([
      "tooltip",
    ]);
  });

  it("entity: supports async readers", async () => {
    const asyncEnv: CompletionEnv = {
      entities: { names: async () => ["alpha", "beta"] },
    };
    await expect(complete(["block", "get", "al"], asyncEnv)).resolves.toEqual([
      "alpha",
    ]);
  });

  it("entity: the empty reader (PR-C default) yields zero candidates", async () => {
    await expect(complete(["block", "get", ""], emptyEnv)).resolves.toEqual([]);
  });

  it("entity: a throwing reader degrades to zero candidates", async () => {
    const hostileEnv: CompletionEnv = {
      entities: {
        names: () => {
          throw new Error("boom");
        },
      },
    };
    await expect(complete(["block", "get", ""], hostileEnv)).resolves.toEqual(
      [],
    );
  });

  it("files: resolves to nothing (native shell completion owns it)", async () => {
    await expect(complete(["block", "get", "--out", ""])).resolves.toEqual([]);
  });

  it("none: resolves to nothing", async () => {
    await expect(complete(["block", "get", "--note", ""])).resolves.toEqual([]);
    await expect(complete(["block", "remove", ""])).resolves.toEqual([]);
  });

  it("reserved/unknown source kinds resolve to nothing with a reason", async () => {
    vi.stubEnv("PRAGMA_COMPLETE_DEBUG", "1");
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const reserved = { kind: "query" } as unknown as CompletionSource;
    await expect(
      resolveRequest(valueRequest(reserved, ""), model, env),
    ).resolves.toEqual([]);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('reserved completion kind "query"'),
    );
  });

  it("caps ranked candidates at 50", async () => {
    const bigEnv: CompletionEnv = {
      entities: {
        names: () =>
          Array.from(
            { length: 80 },
            (_, i) => `name-${String(i).padStart(2, "0")}`,
          ),
      },
    };
    const matches = await complete(["block", "get", "name"], bigEnv);
    expect(matches.length).toBe(50);
  });

  it("returns nothing when nothing matches", async () => {
    await expect(complete(["block", "get", "--view", "zzz"])).resolves.toEqual(
      [],
    );
  });
});

describe("resolveRequest — nothing contexts (PROTECTED)", () => {
  it("resolves nothing for unknown nouns/verbs and exhausted positionals", async () => {
    await expect(complete(["bogus", ""])).resolves.toEqual([]);
    await expect(complete(["block", "zap", ""])).resolves.toEqual([]);
    await expect(complete(["block", "get", "button", ""])).resolves.toEqual([]);
  });

  it("logs the nothing reason on the debug channel", async () => {
    vi.stubEnv("PRAGMA_COMPLETE_DEBUG", "1");
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await complete(["bogus", ""]);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining("nothing: unknown noun"),
    );
  });
});
