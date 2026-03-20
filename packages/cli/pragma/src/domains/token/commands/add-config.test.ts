import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import { PragmaError } from "../../../error/index.js";
import addConfigCommand from "./add-config.js";

function makeCtx(cwd: string): CommandContext {
  return {
    cwd,
    globalFlags: {
      llm: false,
      format: "text",
      verbose: false,
    },
  };
}

describe("tokens add-config command", () => {
  it("writes config file to cwd", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const cmd = addConfigCommand();
      const result = await cmd.execute({}, makeCtx(cwd));
      expect(result.tag).toBe("output");

      const content = readFileSync(join(cwd, "tokens.config.mjs"), "utf-8");
      expect(content).toContain("defineConfig");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("throws INVALID_INPUT when file already exists", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      writeFileSync(join(cwd, "tokens.config.mjs"), "// existing", "utf-8");

      const cmd = addConfigCommand();
      try {
        await cmd.execute({}, makeCtx(cwd));
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PragmaError);
        expect((e as PragmaError).code).toBe("INVALID_INPUT");
      }
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("overwrites with --force", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      writeFileSync(join(cwd, "tokens.config.mjs"), "// old", "utf-8");

      const cmd = addConfigCommand();
      await cmd.execute({ force: true }, makeCtx(cwd));

      const content = readFileSync(join(cwd, "tokens.config.mjs"), "utf-8");
      expect(content).toContain("defineConfig");
      expect(content).not.toContain("// old");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});
