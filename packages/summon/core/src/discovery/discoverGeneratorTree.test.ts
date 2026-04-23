import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { GeneratorDefinition } from "../types/index.js";
import discoverGeneratorTree from "./discoverGeneratorTree.js";
import { generatorCache } from "./generatorCache.js";

// ---------------------------------------------------------------------------
// Mock fs/promises
// ---------------------------------------------------------------------------
vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
}));

import * as fs from "node:fs/promises";

const mockReaddir = fs.readdir as unknown as MockInstance;
const mockAccess = fs.access as unknown as MockInstance;
const mockStat = fs.stat as unknown as MockInstance;
const mockReadFile = fs.readFile as unknown as MockInstance;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dirent = (name: string, isDir: boolean) => ({
  name,
  isDirectory: () => isDir,
  isFile: () => !isDir,
});

const notFound = () =>
  Promise.reject(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

const fakeGenerator = (name: string): GeneratorDefinition => ({
  meta: { name, description: `${name} gen`, version: "1.0.0" },
  prompts: [],
  task: () => ({ _tag: "Pure" as const, value: undefined }),
});

/** Real temp package paths (created before test run). */
const REAL_PKG_DIR = "/tmp/summon-test-pkg";
const REAL_DEFAULT_PKG_DIR = "/tmp/summon-test-default";
const REAL_BROKEN_PKG_DIR = "/tmp/summon-test-broken";
const REAL_EMPTY_PKG_DIR = "/tmp/summon-test-empty";

const ALL_TEMP_DIRS = [
  REAL_PKG_DIR,
  REAL_DEFAULT_PKG_DIR,
  REAL_BROKEN_PKG_DIR,
  REAL_EMPTY_PKG_DIR,
];

const GEN_TEMPLATE = (name: string) =>
  `{ meta: { name: "${name}", description: "${name}", version: "1.0.0" }, prompts: [], task: () => ({ _tag: "Pure", value: undefined }) }`;

beforeAll(() => {
  for (const d of ALL_TEMP_DIRS) rmSync(d, { recursive: true, force: true });

  // Package with 'generators' barrel export
  mkdirSync(REAL_PKG_DIR, { recursive: true });
  writeFileSync(
    path.join(REAL_PKG_DIR, "index.mjs"),
    `export const generators = {
  "component/react": ${GEN_TEMPLATE("react")},
  "component/svelte": ${GEN_TEMPLATE("svelte")},
  "invalid-entry": "not-a-generator",
  "null-entry": null,
};\n`,
  );

  // Package with 'default' barrel export
  mkdirSync(REAL_DEFAULT_PKG_DIR, { recursive: true });
  writeFileSync(
    path.join(REAL_DEFAULT_PKG_DIR, "index.mjs"),
    `export default {
  "util/helper": ${GEN_TEMPLATE("helper")},
};\n`,
  );

  // Package with broken module
  mkdirSync(REAL_BROKEN_PKG_DIR, { recursive: true });
  writeFileSync(
    path.join(REAL_BROKEN_PKG_DIR, "index.mjs"),
    `throw new Error("broken module");\n`,
  );

  // Package with empty export
  mkdirSync(REAL_EMPTY_PKG_DIR, { recursive: true });
  writeFileSync(
    path.join(REAL_EMPTY_PKG_DIR, "index.mjs"),
    `export const something = 42;\n`,
  );
});

afterAll(() => {
  for (const d of ALL_TEMP_DIRS) rmSync(d, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  generatorCache.clear();

  mockReaddir.mockRejectedValue(new Error("ENOENT"));
  mockAccess.mockRejectedValue(new Error("ENOENT"));
  mockStat.mockRejectedValue(new Error("ENOENT"));
  mockReadFile.mockRejectedValue(new Error("ENOENT"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// discoverGeneratorTree
// =============================================================================

describe("discoverGeneratorTree", () => {
  // -------------------------------------------------------------------------
  // Explicit path — directory scanning (buildGeneratorTree)
  // -------------------------------------------------------------------------

  describe("explicit path — directory scanning", () => {
    it("returns empty root for non-existent directory", async () => {
      const root = await discoverGeneratorTree("/non/existent");
      expect(root.children.size).toBe(0);
    });

    it("discovers a single generator with index.ts", async () => {
      const dir = "/my/generators";

      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(dir, "package.json")) return notFound();
        if (p === path.join(dir, "component", "index.ts"))
          return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === dir) return Promise.resolve([dirent("component", true)]);
        if (p === path.join(dir, "component")) return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree(dir);
      expect(root.children.has("component")).toBe(true);
      expect(root.children.get("component")!.indexPath).toBe(
        path.join(dir, "component", "index.ts"),
      );
      expect(root.children.get("component")!.origin).toBe("local");
    });

    it("discovers nested generators", async () => {
      const dir = "/generators";

      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(dir, "package.json")) return notFound();
        if (p === path.join(dir, "component", "react", "index.ts"))
          return Promise.resolve();
        if (p === path.join(dir, "component", "svelte", "index.ts"))
          return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === dir) return Promise.resolve([dirent("component", true)]);
        if (p === path.join(dir, "component"))
          return Promise.resolve([
            dirent("react", true),
            dirent("svelte", true),
          ]);
        if (p === path.join(dir, "component", "react"))
          return Promise.resolve([]);
        if (p === path.join(dir, "component", "svelte"))
          return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree(dir);
      const comp = root.children.get("component")!;
      expect(comp.children.has("react")).toBe(true);
      expect(comp.children.has("svelte")).toBe(true);
    });

    it("skips directories without index.ts and no children", async () => {
      const dir = "/generators";

      mockAccess.mockImplementation(() => notFound());
      mockReaddir.mockImplementation((p: string) => {
        if (p === dir) return Promise.resolve([dirent("empty", true)]);
        if (p === path.join(dir, "empty")) return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree(dir);
      expect(root.children.size).toBe(0);
    });

    it("skips non-directory entries", async () => {
      const dir = "/generators";

      mockAccess.mockImplementation(() => notFound());
      mockReaddir.mockImplementation((p: string) => {
        if (p === dir) return Promise.resolve([dirent("readme.txt", false)]);
        return notFound();
      });

      const root = await discoverGeneratorTree(dir);
      expect(root.children.size).toBe(0);
    });

    it("resolves relative explicit path against cwd", async () => {
      const root = await discoverGeneratorTree("relative/path");
      expect(root.children.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Explicit path — package barrel (processPackage + insertGeneratorAtPath)
  // -------------------------------------------------------------------------

  describe("explicit path — package barrel", () => {
    it("returns empty when package.json has no main field", async () => {
      const pkgDir = "/my/package";

      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json")) return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json"))
          return Promise.resolve(JSON.stringify({}));
        return notFound();
      });

      const root = await discoverGeneratorTree(pkgDir);
      expect(root.children.size).toBe(0);
    });

    it("returns empty when package.json is unreadable", async () => {
      const pkgDir = "/my/bad-package";

      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json")) return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      const root = await discoverGeneratorTree(pkgDir);
      expect(root.children.size).toBe(0);
    });

    it("loads generators from 'generators' barrel export and populates cache", async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(REAL_PKG_DIR, "package.json"))
          return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(REAL_PKG_DIR, "package.json"))
          return Promise.resolve(JSON.stringify({ main: "./index.mjs" }));
        return notFound();
      });

      const root = await discoverGeneratorTree(REAL_PKG_DIR);

      const comp = root.children.get("component");
      expect(comp).toBeDefined();
      expect(comp!.children.has("react")).toBe(true);
      expect(comp!.children.has("svelte")).toBe(true);

      expect(generatorCache.has("component/react")).toBe(true);
      expect(generatorCache.has("component/svelte")).toBe(true);
      // Non-generators should be skipped
      expect(generatorCache.has("invalid-entry")).toBe(false);
      expect(generatorCache.has("null-entry")).toBe(false);

      const react = comp!.children.get("react")!;
      expect(react.indexPath).toBe("cache:component/react");
      expect(react.origin).toBe("local");
    });

    it("loads generators from 'default' barrel export", async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(REAL_DEFAULT_PKG_DIR, "package.json"))
          return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(REAL_DEFAULT_PKG_DIR, "package.json"))
          return Promise.resolve(JSON.stringify({ main: "./index.mjs" }));
        return notFound();
      });

      const root = await discoverGeneratorTree(REAL_DEFAULT_PKG_DIR);
      const util = root.children.get("util");
      expect(util).toBeDefined();
      expect(util!.children.has("helper")).toBe(true);
      expect(generatorCache.has("util/helper")).toBe(true);
    });

    it("handles module with no generators or default export", async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(REAL_EMPTY_PKG_DIR, "package.json"))
          return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(REAL_EMPTY_PKG_DIR, "package.json"))
          return Promise.resolve(JSON.stringify({ main: "./index.mjs" }));
        return notFound();
      });

      const root = await discoverGeneratorTree(REAL_EMPTY_PKG_DIR);
      // Empty generators → no children
      expect(root.children.size).toBe(0);
    });

    it("warns and continues when import() fails", async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(REAL_BROKEN_PKG_DIR, "package.json"))
          return Promise.resolve();
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(REAL_BROKEN_PKG_DIR, "package.json"))
          return Promise.resolve(JSON.stringify({ main: "./index.mjs" }));
        return notFound();
      });

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const root = await discoverGeneratorTree(REAL_BROKEN_PKG_DIR);
      expect(root.children.size).toBe(0);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Normal discovery mode (no explicitPath)
  // -------------------------------------------------------------------------

  describe("normal discovery mode", () => {
    it("returns empty root when nothing exists", async () => {
      const root = await discoverGeneratorTree();
      expect(root.name).toBe("root");
      expect(root.children.size).toBe(0);
    });

    it("discovers built-ins from custom builtinDir", async () => {
      const builtinDir = "/custom/builtin";

      mockAccess.mockImplementation((p: string) => {
        if (p === path.join(builtinDir, "hello", "index.ts"))
          return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === builtinDir) return Promise.resolve([dirent("hello", true)]);
        if (p === path.join(builtinDir, "hello")) return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree({ builtinDir });
      expect(root.children.has("hello")).toBe(true);
      expect(root.children.get("hello")!.origin).toBe("builtin");
    });

    it("scans node_modules for unscoped summon-* packages", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");
      const pkgDir = path.join(nmDir, "summon-react");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["summon-react", "lodash"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === pkgDir) return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      mockAccess.mockImplementation(() => notFound());
      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json"))
          return Promise.resolve(JSON.stringify({}));
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent-builtin",
      });
      expect(root.children.size).toBe(0);
    });

    it("scans node_modules for scoped @org/summon-* packages", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");
      const scopeDir = path.join(nmDir, "@myorg");
      const pkgDir = path.join(scopeDir, "summon-utils");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["@myorg"]);
        if (p === scopeDir)
          return Promise.resolve(["summon-utils", "other-pkg"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === scopeDir) return Promise.resolve({ isDirectory: () => true });
        if (p === pkgDir) return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      mockAccess.mockImplementation(() => notFound());
      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json"))
          return Promise.resolve(JSON.stringify({}));
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent-builtin",
      });
      expect(root.children.size).toBe(0);
    });

    it("skips non-directory scoped entries in node_modules", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["@myorg"]);
        return notFound();
      });

      mockStat.mockImplementation(() =>
        Promise.resolve({ isDirectory: () => false }),
      );

      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });

    it("skips non-directory summon-* entries in node_modules", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["summon-react"]);
        return notFound();
      });

      mockStat.mockImplementation(() =>
        Promise.resolve({ isDirectory: () => false }),
      );

      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });

    it("handles scope readdir failure in node_modules", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["@broken"]);
        if (p === path.join(nmDir, "@broken"))
          return Promise.reject(new Error("EACCES"));
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === path.join(nmDir, "@broken"))
          return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });

    it("skips scoped summon-* that is not a directory in node_modules", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");
      const scopeDir = path.join(nmDir, "@myorg");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["@myorg"]);
        if (p === scopeDir) return Promise.resolve(["summon-file-not-dir"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === scopeDir) return Promise.resolve({ isDirectory: () => true });
        // summon-file-not-dir is NOT a directory
        if (p === path.join(scopeDir, "summon-file-not-dir"))
          return Promise.resolve({ isDirectory: () => false });
        return notFound();
      });

      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });

    it("handles stat failure (isDirectory catch path) in node_modules", async () => {
      const nmDir = path.join(process.cwd(), "node_modules");

      mockReaddir.mockImplementation((p: string) => {
        if (p === nmDir) return Promise.resolve(["summon-bad"]);
        return notFound();
      });

      // stat throws for ALL paths — exercises isDirectory catch branch
      mockStat.mockRejectedValue(new Error("EIO"));
      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Global packages (bun + npm)
  // -------------------------------------------------------------------------

  describe("global package discovery", () => {
    it("scans bun global node_modules with BUN_INSTALL", async () => {
      const orig = process.env.BUN_INSTALL;
      process.env.BUN_INSTALL = "/custom/bun";
      const bunNm = "/custom/bun/install/global/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === bunNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === bunNm) return Promise.resolve(["summon-pkg"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === path.join(bunNm, "summon-pkg"))
          return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(bunNm, "summon-pkg", "package.json"))
          return Promise.resolve(JSON.stringify({}));
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.BUN_INSTALL = orig;
    });

    it("uses HOME fallback when BUN_INSTALL is unset", async () => {
      const orig = process.env.BUN_INSTALL;
      delete process.env.BUN_INSTALL;

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.BUN_INSTALL = orig;
    });

    it("scans npm global when NPM_CONFIG_PREFIX is set", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm/prefix";
      const npmNm = "/npm/prefix/lib/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("scans npm global via NVM_DIR when accessible", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      const origNvm = process.env.NVM_DIR;
      delete process.env.NPM_CONFIG_PREFIX;
      process.env.NVM_DIR = "/home/user/.nvm";

      const nvmNm = path.join(
        "/home/user/.nvm",
        "versions",
        "node",
        process.version,
        "lib",
        "node_modules",
      );

      mockAccess.mockImplementation((p: string) => {
        if (p === nvmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === nvmNm) return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
      process.env.NVM_DIR = origNvm;
    });

    it("falls back to common npm paths when NVM_DIR inaccessible", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      const origNvm = process.env.NVM_DIR;
      delete process.env.NPM_CONFIG_PREFIX;
      process.env.NVM_DIR = "/fake/nvm";

      mockAccess.mockImplementation((p: string) => {
        if (p === "/usr/local/lib/node_modules") return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === "/usr/local/lib/node_modules") return Promise.resolve([]);
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
      process.env.NVM_DIR = origNvm;
    });

    it("returns null npm path when no common paths accessible", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      const origNvm = process.env.NVM_DIR;
      delete process.env.NPM_CONFIG_PREFIX;
      delete process.env.NVM_DIR;

      mockAccess.mockImplementation(() => notFound());

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
      process.env.NVM_DIR = origNvm;
    });

    it("scans scoped @org/summon-* in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";
      const scopeDir = path.join(npmNm, "@acme");
      const pkgDir = path.join(scopeDir, "summon-tools");

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["@acme"]);
        if (p === scopeDir) return Promise.resolve(["summon-tools", "other"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === scopeDir) return Promise.resolve({ isDirectory: () => true });
        if (p === pkgDir) return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      mockReadFile.mockImplementation((p: string) => {
        if (p === path.join(pkgDir, "package.json"))
          return Promise.resolve(JSON.stringify({}));
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("skips non-directory scoped entries in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["@scope"]);
        return notFound();
      });

      mockStat.mockImplementation(() =>
        Promise.resolve({ isDirectory: () => false }),
      );

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("skips non-directory summon-* in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["summon-thing"]);
        return notFound();
      });

      mockStat.mockImplementation(() =>
        Promise.resolve({ isDirectory: () => false }),
      );

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("skips scoped summon-* that is not a directory in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";
      const scopeDir = path.join(npmNm, "@org");

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["@org"]);
        if (p === scopeDir) return Promise.resolve(["summon-file-not-dir"]);
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === scopeDir) return Promise.resolve({ isDirectory: () => true });
        if (p === path.join(scopeDir, "summon-file-not-dir"))
          return Promise.resolve({ isDirectory: () => false });
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("skips non-summon entries in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["lodash", "express"]);
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });

    it("handles scope readdir failure in global packages", async () => {
      const origPrefix = process.env.NPM_CONFIG_PREFIX;
      process.env.NPM_CONFIG_PREFIX = "/npm";
      const npmNm = "/npm/lib/node_modules";

      mockAccess.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve();
        return notFound();
      });

      mockReaddir.mockImplementation((p: string) => {
        if (p === npmNm) return Promise.resolve(["@broken"]);
        if (p === path.join(npmNm, "@broken"))
          return Promise.reject(new Error("EACCES"));
        return notFound();
      });

      mockStat.mockImplementation((p: string) => {
        if (p === path.join(npmNm, "@broken"))
          return Promise.resolve({ isDirectory: () => true });
        return notFound();
      });

      const root = await discoverGeneratorTree({
        builtinDir: "/nonexistent",
      });
      expect(root.children.size).toBe(0);

      process.env.NPM_CONFIG_PREFIX = origPrefix;
    });
  });

  // -------------------------------------------------------------------------
  // Options parsing
  // -------------------------------------------------------------------------

  describe("options parsing", () => {
    it("accepts string as explicit path", async () => {
      const root = await discoverGeneratorTree("/nonexistent");
      expect(root.children.size).toBe(0);
    });

    it("accepts options object with explicitPath", async () => {
      const root = await discoverGeneratorTree({
        explicitPath: "/nonexistent",
      });
      expect(root.children.size).toBe(0);
    });

    it("defaults to empty options", async () => {
      const root = await discoverGeneratorTree();
      expect(root.name).toBe("root");
    });
  });
});

// =============================================================================
// generatorCache
// =============================================================================

describe("generatorCache", () => {
  it("stores and retrieves generator definitions", () => {
    const gen = fakeGenerator("test");
    generatorCache.set("test/gen", gen);
    expect(generatorCache.get("test/gen")).toBe(gen);
    generatorCache.delete("test/gen");
  });
});
