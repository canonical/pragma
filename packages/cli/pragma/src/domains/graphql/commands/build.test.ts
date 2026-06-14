import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandDefinition } from "@canonical/cli-core";
import { hashSources } from "@canonical/ke-graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EX_PREFIX_ENTRY,
  GRAPHQL_CLEAN_TTL,
  GRAPHQL_ERROR_TTL,
  GRAPHQL_FATAL_TTL,
} from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import type { GraphqlCompileReport } from "../types.js";
import buildCommand from "./build.js";

let dir: string;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pragma-graphql-build-"));
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

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: GraphqlCompileReport; text: string }> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  return {
    value: result.value as GraphqlCompileReport,
    text: result.render.plain(result.value),
  };
}

describe("graphql build command", () => {
  it("writes the SDL and extraction artifacts to the default paths", async () => {
    const ctx = makeCtx();
    const { value } = await executeOutput(
      buildCommand,
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    const sdl = readFileSync(join(dir, "schema.graphql"), "utf-8");
    expect(sdl).toContain("type Thing");

    const artifact = JSON.parse(
      readFileSync(join(dir, "extraction.json"), "utf-8"),
    ) as { version: number; sourcesHash: string };
    expect(artifact.version).toBe(1);

    const raw = readFileSync(join(dir, "clean.ttl"), "utf-8");
    expect(artifact.sourcesHash).toBe(hashSources([raw]));
    expect(value.artifacts).toEqual({
      sdl: join(dir, "schema.graphql"),
      extraction: join(dir, "extraction.json"),
    });
  });

  it("writes artifacts to custom --sdl and --extraction paths", async () => {
    const ctx = makeCtx();
    await executeOutput(
      buildCommand,
      {
        sources: ["clean.ttl"],
        prefix: [EX_PREFIX_ENTRY],
        sdl: "out/api.graphql",
        extraction: "out/api-extraction.json",
      },
      ctx,
    );

    expect(readFileSync(join(dir, "out", "api.graphql"), "utf-8")).toContain(
      "type Thing",
    );
    expect(
      JSON.parse(
        readFileSync(join(dir, "out", "api-extraction.json"), "utf-8"),
      ),
    ).toMatchObject({ version: 1 });
  });

  it("renders plain output with a summary and artifact paths", async () => {
    const ctx = makeCtx();
    const { text } = await executeOutput(
      buildCommand,
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(text).toContain("1 source file: 0 errors, 0 warnings, 0 info");
    expect(text).toContain(`Wrote ${join(dir, "schema.graphql")}`);
    expect(text).toContain(`Wrote ${join(dir, "extraction.json")}`);
  });

  it("prints error diagnostics but still writes artifacts", async () => {
    const ctx = makeCtx();
    const { text } = await executeOutput(
      buildCommand,
      { sources: ["error.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(text).toContain("M001");
    expect(text).toContain("1 error");
    expect(existsSync(join(dir, "schema.graphql"))).toBe(true);
    expect(existsSync(join(dir, "extraction.json"))).toBe(true);
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const { text } = await executeOutput(
      buildCommand,
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(text).toContain("## GraphQL Compile");
    expect(text).toContain("**Summary:**");
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const { text } = await executeOutput(
      buildCommand,
      { sources: ["clean.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    const parsed = JSON.parse(text) as GraphqlCompileReport;
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.files).toEqual([join(dir, "clean.ttl")]);
  });

  it("exits non-zero and writes no artifacts when compilation fails", async () => {
    const ctx = makeCtx();
    const result = await buildCommand.execute(
      { sources: ["fatal.ttl"], prefix: [EX_PREFIX_ENTRY] },
      ctx,
    );

    expect(result.tag).toBe("exit");
    if (result.tag !== "exit") throw new Error("Expected exit result");
    expect(result.code).toBe(1);
    expect(existsSync(join(dir, "schema.graphql"))).toBe(false);
    expect(existsSync(join(dir, "extraction.json"))).toBe(false);

    const printed = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(printed).toContain("C003");
  });

  it("throws structured error when sources are missing", async () => {
    const ctx = makeCtx();

    await expect(buildCommand.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        message: "Provide at least one TTL file or glob pattern.",
      },
    });
  });
});
