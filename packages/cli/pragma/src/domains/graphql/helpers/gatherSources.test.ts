import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRAPHQL_CLEAN_TTL } from "#testing";
import resolveConfiguredGraphs from "../../shared/resolveConfiguredGraphs.js";
import gatherSources from "./gatherSources.js";

vi.mock("../../shared/resolveConfiguredGraphs.js", () => ({
  default: vi.fn(),
}));

const mockResolve = vi.mocked(resolveConfiguredGraphs);

describe("gatherSources", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-gather-"));
    writeFileSync(join(dir, "a.ttl"), GRAPHQL_CLEAN_TTL);
    writeFileSync(join(dir, "b.ttl"), GRAPHQL_CLEAN_TTL);
    mockResolve.mockReset();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads explicit files into inline sources, ignoring the config", async () => {
    const sources = await gatherSources(["a.ttl"], dir);

    expect(sources).toEqual([
      {
        content: GRAPHQL_CLEAN_TTL,
        format: "turtle",
        path: join(dir, "a.ttl"),
      },
    ]);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("expands glob patterns", async () => {
    const sources = await gatherSources(["*.ttl"], dir);

    expect(sources.map((source) => source.path).sort()).toEqual([
      join(dir, "a.ttl"),
      join(dir, "b.ttl"),
    ]);
  });

  it("throws when explicit sources match nothing", async () => {
    await expect(gatherSources(["none-*.ttl"], dir)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        message: "No files matched the given paths or glob patterns.",
      },
    });
  });

  it("falls back to the configured package graphs when no sources are given", async () => {
    mockResolve.mockResolvedValue([
      {
        path: "definitions/ontology.ttl",
        content: GRAPHQL_CLEAN_TTL,
        format: "turtle",
      },
    ]);

    const sources = await gatherSources([], dir);

    expect(mockResolve).toHaveBeenCalledWith(dir);
    expect(sources).toEqual([
      {
        content: GRAPHQL_CLEAN_TTL,
        format: "turtle",
        path: "definitions/ontology.ttl",
      },
    ]);
  });

  it("throws when no sources are given and no packages resolve", async () => {
    mockResolve.mockResolvedValue([]);

    await expect(gatherSources([], dir)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        message:
          "No TTL sources given and no semantic packages resolved. Pass TTL files or globs, or configure `packages` in pragma.config.json and install them.",
      },
    });
  });
});
