/**
 * Tests for @canonical/summon-monorepo generator (dry-run)
 */

import { readFileSync } from "node:fs";
import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator } from "./monorepo/index.js";

/** Provide a real ReadFile mock so templates render with actual content */
const realReadFile = new Map<string, (effect: Effect) => unknown>([
  ["ReadFile", (e) => readFileSync((e as { path: string }).path, "utf-8")],
]);

type FileEntry = { path: string; content: string };

const dryRun = (task: Parameters<typeof dryRunWith>[0]) =>
  dryRunWith(task, realReadFile);

const getFiles = (result: ReturnType<typeof dryRun>): FileEntry[] =>
  result.effects
    .filter(
      (
        e,
      ): e is Extract<(typeof result.effects)[number], { _tag: "WriteFile" }> =>
        e._tag === "WriteFile",
    )
    .map((e) => ({ path: e.path, content: e.content }));

const defaultAnswers = {
  name: "test-monorepo",
  description: "A test monorepo",
  license: "LGPL-3.0" as const,
  typescriptConfig: "@canonical/typescript-config-base",
  repository: "https://github.com/test/test-monorepo",
  bunVersion: "1.3.9",
  runInstall: false,
  initGit: false,
};

describe("monorepo generator", () => {
  describe("dry run", () => {
    it("generates all expected files", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const filePaths = getFiles(result).map((f) => f.path);

      // Root config files
      expect(filePaths).toContain("test-monorepo/package.json");
      expect(filePaths).toContain("test-monorepo/lerna.json");
      expect(filePaths).toContain("test-monorepo/nx.json");
      expect(filePaths).toContain("test-monorepo/tsconfig.json");
      expect(filePaths).toContain("test-monorepo/biome.json");
      expect(filePaths).toContain("test-monorepo/.gitignore");
      expect(filePaths).toContain("test-monorepo/README.md");
      expect(filePaths).toContain("test-monorepo/LICENSE");

      // Scripts
      expect(filePaths).toContain("test-monorepo/scripts/publish-status.ts");

      // GitHub workflows
      expect(filePaths).toContain("test-monorepo/.github/workflows/ci.yml");
      expect(filePaths).toContain(
        "test-monorepo/.github/workflows/pr-lint.yml",
      );
      expect(filePaths).toContain("test-monorepo/.github/workflows/tag.yml");

      // GitHub actions
      expect(filePaths).toContain(
        "test-monorepo/.github/actions/setup-env/action.yml",
      );
      expect(filePaths).toContain(
        "test-monorepo/.github/actions/setup-git/action.yml",
      );
      expect(filePaths).toContain(
        "test-monorepo/.github/actions/lerna-version/action.yml",
      );
      expect(filePaths).toContain(
        "test-monorepo/.github/actions/lerna-version/version.sh",
      );
      expect(filePaths).toContain(
        "test-monorepo/.github/actions/lerna-version/git-commit.sh",
      );

      // PR template
      expect(filePaths).toContain(
        "test-monorepo/.github/PULL_REQUEST_TEMPLATE.md",
      );
    });

    it("generates valid package.json with correct metadata", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const pkgFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/package.json",
      );
      expect(pkgFile).toBeDefined();

      const pkg = JSON.parse(pkgFile?.content ?? "");
      expect(pkg.name).toBe("test-monorepo-monorepo");
      expect(pkg.private).toBe(true);
      expect(pkg.version).toBe("0.0.0");
      expect(pkg.description).toBe("A test monorepo");
      expect(pkg.license).toBe("LGPL-3.0");
      expect(pkg.repository.url).toBe("https://github.com/test/test-monorepo");
      expect(pkg.workspaces).toEqual(["packages/*"]);
      expect(pkg.scripts.build).toBe("lerna run build");
      expect(pkg.scripts["test:coverage"]).toBe("lerna run test:coverage");
      expect(pkg.scripts["publish:status"]).toBe(
        "bun scripts/publish-status.ts",
      );
      expect(pkg.devDependencies.lerna).toBeDefined();
      expect(pkg.devDependencies.nx).toBeDefined();
      expect(pkg.devDependencies["@vitest/coverage-v8"]).toBeDefined();
    });

    it("generates lerna.json with fixed versioning", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const lernaFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/lerna.json",
      );
      expect(lernaFile).toBeDefined();

      const lerna = JSON.parse(lernaFile?.content ?? "");
      expect(lerna.version).toBe("0.0.1");
    });

    it("generates tsconfig extending the chosen config", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const tsconfigFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/tsconfig.json",
      );
      expect(tsconfigFile).toBeDefined();

      const tsconfig = JSON.parse(tsconfigFile?.content ?? "");
      expect(tsconfig.extends).toBe("@canonical/typescript-config-base");
    });

    it("generates tsconfig with lit config when selected", () => {
      const result = dryRun(
        generator.generate({
          ...defaultAnswers,
          typescriptConfig: "@canonical/typescript-config-lit",
        }),
      );

      const tsconfigFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/tsconfig.json",
      );
      const tsconfig = JSON.parse(tsconfigFile?.content ?? "");
      expect(tsconfig.extends).toBe("@canonical/typescript-config-lit");
    });

    it("generates biome.json extending @canonical/biome-config", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const biomeFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/biome.json",
      );
      expect(biomeFile).toBeDefined();

      const biome = JSON.parse(biomeFile?.content ?? "");
      expect(biome.extends).toEqual(["@canonical/biome-config"]);
    });

    it("generates tag.yml with NPM_AUTH_TOKEN", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const tagFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/.github/workflows/tag.yml",
      );
      expect(tagFile).toBeDefined();
      expect(tagFile?.content).toContain("NPM_AUTH_TOKEN");
      expect(tagFile?.content).not.toContain("NODE_AUTH_TOKEN");
    });

    it("generates setup-env with pinned bun version", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const setupFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/.github/actions/setup-env/action.yml",
      );
      expect(setupFile).toBeDefined();
      expect(setupFile?.content).toContain('default: "1.3.9"');
    });

    it("generates GPL-3.0 license when selected", () => {
      const result = dryRun(
        generator.generate({
          ...defaultAnswers,
          license: "GPL-3.0",
        }),
      );

      const licenseFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/LICENSE",
      );
      expect(licenseFile).toBeDefined();
      expect(licenseFile?.content).toContain("GNU GENERAL PUBLIC LICENSE");
    });

    it("generates LGPL-3.0 license by default", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const licenseFile = getFiles(result).find(
        (f) => f.path === "test-monorepo/LICENSE",
      );
      expect(licenseFile).toBeDefined();
      expect(licenseFile?.content).toContain(
        "GNU LESSER GENERAL PUBLIC LICENSE",
      );
    });

    it("does not generate any package directories", () => {
      const result = dryRun(generator.generate(defaultAnswers));

      const filePaths = getFiles(result).map((f) => f.path);
      const packageFiles = filePaths.filter(
        (p: string) =>
          p.startsWith("test-monorepo/packages/") && !p.endsWith("/"),
      );
      expect(packageFiles).toHaveLength(0);
    });
  });
});
