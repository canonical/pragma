import { afterEach, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import serveCommand, { readPort } from "./serve.js";

describe("readPort", () => {
  it("parses a valid port", () => {
    expect(readPort("4001")).toBe(4001);
  });

  it("uses the default when the flag is absent", () => {
    expect(readPort(undefined)).toBe(4000);
    expect(readPort("")).toBe(4000);
  });

  it("rejects an out-of-range or unparseable provided port", () => {
    for (const value of ["0", "70000", "not-a-port"]) {
      expect(() => readPort(value)).toThrowError(PragmaError);
      try {
        readPort(value);
      } catch (error) {
        expect((error as PragmaError).code).toBe("INVALID_INPUT");
      }
    }
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
