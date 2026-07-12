import { afterEach, describe, expect, it } from "vitest";
import type { PragmaContext } from "../../shared/context.js";
import serveCommand, { readPort } from "./serve.js";

describe("readPort", () => {
  it("parses a valid port", () => {
    expect(readPort("4001")).toBe(4001);
  });

  it("falls back to the default for non-string values", () => {
    expect(readPort(undefined)).toBe(4000);
    expect(readPort(4001)).toBe(4000);
  });

  it("falls back to the default for out-of-range or unparseable values", () => {
    expect(readPort("0")).toBe(4000);
    expect(readPort("70000")).toBe(4000);
    expect(readPort("not-a-port")).toBe(4000);
  });
});

describe("graphql serve command", () => {
  const ctx = { cwd: process.cwd() } as PragmaContext;
  const original = (globalThis as Record<string, unknown>).Bun;

  afterEach(() => {
    (globalThis as Record<string, unknown>).Bun = original;
  });

  it("requires the Bun runtime", async () => {
    (globalThis as Record<string, unknown>).Bun = undefined;

    await expect(serveCommand.execute({}, ctx)).rejects.toMatchObject({
      code: "STORE_ERROR",
      recovery: {
        message: "Run the compiled `pragma` binary or use `bun run`.",
      },
    });
  });
});
