import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashSources } from "@canonical/ke-graphql";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EX_NAMESPACE,
  GRAPHQL_CLEAN_TTL,
  GRAPHQL_ERROR_TTL,
  GRAPHQL_FATAL_TTL,
} from "#testing";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import compileSchema from "./compileSchema.js";

const PREFIXES = { ...PREFIX_MAP, ex: EX_NAMESPACE };

describe("compileSchema", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-graphql-compile-"));
    writeFileSync(join(dir, "clean.ttl"), GRAPHQL_CLEAN_TTL);
    writeFileSync(join(dir, "error.ttl"), GRAPHQL_ERROR_TTL);
    writeFileSync(join(dir, "fatal.ttl"), GRAPHQL_FATAL_TTL);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("compiles a clean ontology into SDL", async () => {
    const outcome = await compileSchema({
      sources: ["clean.ttl"],
      prefixes: PREFIXES,
      cwd: dir,
    });

    expect(outcome.status).toBe("ok");
    expect(outcome.compiled?.sdl).toContain("type Thing");
    expect(outcome.diagnostics).toEqual([]);
    expect(outcome.files).toEqual([join(dir, "clean.ttl")]);
  });

  it("hashes the exact raw file contents", async () => {
    const outcome = await compileSchema({
      sources: ["clean.ttl"],
      prefixes: PREFIXES,
      cwd: dir,
    });

    const raw = readFileSync(join(dir, "clean.ttl"), "utf-8");
    expect(outcome.sourcesHash).toBe(hashSources([raw]));
  });

  it("resolves glob patterns to source files", async () => {
    const outcome = await compileSchema({
      sources: ["clean*.ttl"],
      prefixes: PREFIXES,
      cwd: dir,
    });

    expect(outcome.status).toBe("ok");
    expect(outcome.files).toEqual([join(dir, "clean.ttl")]);
  });

  it("surfaces error diagnostics without failing the compile", async () => {
    const outcome = await compileSchema({
      sources: ["error.ttl"],
      prefixes: PREFIXES,
      cwd: dir,
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
      sources: ["fatal.ttl"],
      prefixes: PREFIXES,
      cwd: dir,
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.compiled).toBeUndefined();
    expect(
      outcome.diagnostics.some(
        (d) => d.severity === "error" && d.code === "C003",
      ),
    ).toBe(true);
  });

  it("throws structured error when no sources resolve", async () => {
    await expect(
      compileSchema({
        sources: ["missing.ttl"],
        prefixes: PREFIXES,
        cwd: dir,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("throws structured error on invalid TTL syntax", async () => {
    writeFileSync(join(dir, "broken.ttl"), "this is not turtle .");

    await expect(
      compileSchema({
        sources: ["broken.ttl"],
        prefixes: PREFIXES,
        cwd: dir,
      }),
    ).rejects.toMatchObject({ code: "STORE_ERROR" });
  });
});
