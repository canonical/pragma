import { hashSources } from "@canonical/ke-graphql";
import { describe, expect, it } from "vitest";
import {
  EX_NAMESPACE,
  GRAPHQL_CLEAN_TTL,
  GRAPHQL_ERROR_TTL,
  GRAPHQL_FATAL_TTL,
} from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../shared/prefixes.js";
import compileSchema from "./compileSchema.js";

const PREFIXES = { ...DEFAULT_PREFIX_MAP, ex: EX_NAMESPACE };

const inline = (content: string, path: string) => ({
  content,
  format: "turtle" as const,
  path,
});

describe("compileSchema", () => {
  it("compiles a clean ontology into SDL", async () => {
    const outcome = await compileSchema({
      sources: [inline(GRAPHQL_CLEAN_TTL, "clean.ttl")],
      prefixes: PREFIXES,
    });

    expect(outcome.status).toBe("ok");
    expect(outcome.compiled?.sdl).toContain("type Thing");
    expect(outcome.diagnostics).toEqual([]);
    expect(outcome.files).toEqual(["clean.ttl"]);
  });

  it("hashes the exact raw source contents", async () => {
    const outcome = await compileSchema({
      sources: [inline(GRAPHQL_CLEAN_TTL, "clean.ttl")],
      prefixes: PREFIXES,
    });

    expect(outcome.sourcesHash).toBe(hashSources([GRAPHQL_CLEAN_TTL]));
  });

  it("labels a source without a path as 'inline'", async () => {
    const outcome = await compileSchema({
      sources: [{ content: GRAPHQL_CLEAN_TTL, format: "turtle" }],
      prefixes: PREFIXES,
    });

    expect(outcome.files).toEqual(["inline"]);
  });

  it("surfaces error diagnostics without failing the compile", async () => {
    const outcome = await compileSchema({
      sources: [inline(GRAPHQL_ERROR_TTL, "error.ttl")],
      prefixes: PREFIXES,
    });

    expect(outcome.status).toBe("ok");
    expect(outcome.compiled).toBeDefined();
    expect(
      outcome.diagnostics.some(
        (d) => d.severity === "error" && d.code === "M001",
      ),
    ).toBe(true);
  });

  it("converts CompilationError into a failed result with diagnostics", async () => {
    const outcome = await compileSchema({
      sources: [inline(GRAPHQL_FATAL_TTL, "fatal.ttl")],
      prefixes: PREFIXES,
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.compiled).toBeUndefined();
    expect(
      outcome.diagnostics.some(
        (d) => d.severity === "error" && d.code === "C003",
      ),
    ).toBe(true);
  });

  it("throws a structured error when given no sources", async () => {
    await expect(
      compileSchema({ sources: [], prefixes: PREFIXES }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("throws a structured error on invalid TTL syntax", async () => {
    await expect(
      compileSchema({
        sources: [inline("this is not turtle .", "broken.ttl")],
        prefixes: PREFIXES,
      }),
    ).rejects.toMatchObject({ code: "STORE_ERROR" });
  });
});
