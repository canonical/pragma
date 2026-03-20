import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import resolveAddConfig from "./add-config.js";

describe("resolveAddConfig", () => {
  it("returns correct config path", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const result = resolveAddConfig(cwd);
      expect(result.configPath).toBe(join(cwd, "tokens.config.mjs"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("returns alreadyExists: false when file does not exist", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const result = resolveAddConfig(cwd);
      expect(result.alreadyExists).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("returns alreadyExists: true when file exists", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      writeFileSync(join(cwd, "tokens.config.mjs"), "// existing", "utf-8");
      const result = resolveAddConfig(cwd);
      expect(result.alreadyExists).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("config content contains defineConfig", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const result = resolveAddConfig(cwd);
      expect(result.configContent).toContain("defineConfig");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("token sources include ds-global path", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const result = resolveAddConfig(cwd);
      expect(result.tokenSources[0]).toContain("@canonical/ds-global");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("provides install hint for terrazzo-lsp", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-test-"));
    try {
      const result = resolveAddConfig(cwd);
      expect(result.installHint).toContain("terrazzo-lsp");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});
