import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EX_PREFIX_ENTRY,
  GRAPHQL_CLEAN_TTL,
  GRAPHQL_ERROR_TTL,
  GRAPHQL_FATAL_TTL,
} from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import type { GraphqlCompileReport } from "../types.js";
import checkCommand from "./check.js";

let dir: string;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pragma-graphql-check-"));
  writeFileSync(join(dir, "clean.ttl"), GRAPHQL_CLEAN_TTL);
  writeFileSync(join(dir, "error.ttl"), GRAPHQL_ERROR_TTL);
  writeFileSync(join(dir, "fatal.ttl"), GRAPHQL_FATAL_TTL);
  stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  stdoutSpy.mockRestore();
  rmSync(dir, { recursive: true, force: true });
});

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    cwd: dir,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as PragmaContext["store"],
    config: { tier: undefined, channel: "normal" },
    ...overrides,
  } as PragmaContext;
}

function printedOutput(): string {
  return stdoutSpy.mock.calls.map((call) => call[0]).join("");
}

describe("graphql check command", () => {
  it("passes a clean ontology with a summary line", async () => {
    const ctx = makeCtx();
    const result = await checkCommand.execute(
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(result.tag).toBe("output");
    if (result.tag !== "output") throw new Error("Expected output result");
    const text = result.render.plain(result.value);
    expect(text).toContain("1 source file: 0 errors, 0 warnings, 0 info");
  });

  it("exits non-zero and prints diagnostics on error diagnostics", async () => {
    const ctx = makeCtx();
    const result = await checkCommand.execute(
      { sources: ["error.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(result.tag).toBe("exit");
    if (result.tag !== "exit") throw new Error("Expected exit result");
    expect(result.code).toBe(1);

    const printed = printedOutput();
    expect(printed).toContain("M001");
    expect(printed).toContain("error");
    expect(printed).toContain("1 error, 2 warnings, 0 info");
  });

  it("exits non-zero when compilation fails entirely", async () => {
    const ctx = makeCtx();
    const result = await checkCommand.execute(
      { sources: ["fatal.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(result.tag).toBe("exit");
    if (result.tag !== "exit") throw new Error("Expected exit result");
    expect(result.code).toBe(1);
    expect(printedOutput()).toContain("C003");
  });

  it("passes with warnings when prefixes are not registered", async () => {
    const ctx = makeCtx();
    const result = await checkCommand.execute({ sources: ["clean.ttl"] }, ctx);

    expect(result.tag).toBe("output");
    if (result.tag !== "output") throw new Error("Expected output result");
    const text = result.render.plain(result.value);
    expect(text).toContain("1 warning");
    expect(text).toContain("0 errors");
  });

  it("writes no artifacts", async () => {
    const ctx = makeCtx();
    const before = readdirSync(dir).sort();
    await checkCommand.execute(
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(readdirSync(dir).sort()).toEqual(before);
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const result = await checkCommand.execute(
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(result.tag).toBe("output");
    if (result.tag !== "output") throw new Error("Expected output result");
    const parsed = JSON.parse(
      result.render.plain(result.value),
    ) as GraphqlCompileReport;
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.artifacts).toBeUndefined();
  });

  it("throws structured error when sources are missing", async () => {
    const ctx = makeCtx();

    await expect(checkCommand.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        message: "Provide at least one TTL file or glob pattern.",
      },
    });
  });
});
