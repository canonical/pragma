import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { PragmaContext } from "../context.js";
import requirePragmaContext from "./requirePragmaContext.js";

describe("requirePragmaContext", () => {
  it("returns a context that carries the pragma runtime", () => {
    const ctx = {
      cwd: "/",
      globalFlags: { llm: false, format: "text", verbose: false },
      store: {},
    } as unknown as PragmaContext;
    expect(requirePragmaContext(ctx)).toBe(ctx);
  });

  it("throws for a context without the runtime", () => {
    const bare = {
      cwd: "/",
      globalFlags: { llm: false, format: "text" as const, verbose: false },
    };
    expect(() => requirePragmaContext(bare)).toThrow(PragmaError);
  });
});
