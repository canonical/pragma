/**
 * Tests for summon-package generator (dry-run)
 */

import { readFileSync } from "node:fs";
import { renderString } from "@canonical/summon-core";
import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import pkg from "../package.json" with { type: "json" };
import { generator } from "./package/index.js";
import {
  createTemplateContext,
  type MonorepoInfo,
  type PackageAnswers,
} from "./shared/index.js";

interface Manifest {
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
  bin?: Record<string, string>;
  files: string[];
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** Render the package.json template the way the generator does, and parse it. */
const renderManifest = (
  answers: PackageAnswers,
  monorepoInfo: MonorepoInfo = { isMonorepo: false },
): Manifest => {
  const ctx = createTemplateContext(answers, monorepoInfo);
  // The Svelte arm has a manifest of its own — the generator picks it the
  // same way, off the RESOLVED framework rather than the raw answer.
  const templatePath =
    ctx.framework === "svelte"
      ? "./templates/svelte/package.json.ejs"
      : "./templates/package.json.ejs";
  const source = readFileSync(new URL(templatePath, import.meta.url), "utf-8");
  return JSON.parse(renderString(source, ctx));
};

/** The paths a generated package writes, in dry-run order. */
const generatedPaths = (answers: PackageAnswers): string[] =>
  dryRun(generator.generate(answers))
    .effects.filter((e) => e._tag === "WriteFile")
    .map((e) => (e as { path: string }).path);

describe("package generator", () => {
  it("has correct meta information", () => {
    expect(generator.meta.name).toBe("package");
    expect(generator.meta.version).toBe(pkg.version);
    expect(generator.meta.description).toBeDefined();
  });

  it("defines required prompts", () => {
    const promptNames = generator.prompts.map((p) => p.name);

    expect(promptNames).toContain("name");
    expect(promptNames).toContain("type");
    expect(promptNames).toContain("description");
    expect(promptNames).toContain("framework");
    expect(promptNames).toContain("withCli");
    expect(promptNames).toContain("runInstall");
  });

  it("offers the framework as a three-valued select", () => {
    // A boolean cannot express three frameworks; the CLI flag surface is
    // derived from the prompt, so the prompt is where the shape is decided.
    const framework = generator.prompts.find((p) => p.name === "framework");

    expect(framework?.type).toBe("select");
    expect(framework?.choices?.map((c) => c.value)).toEqual([
      "none",
      "react",
      "svelte",
    ]);
  });

  it("generates expected files for tool-ts package", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-tool",
      type: "tool-ts",
      description: "My tool",
      framework: "none",
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("tsconfig.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("index.ts"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

    expect(writePaths.some((p) => p.endsWith("cli.ts"))).toBe(false);
    expect(writePaths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(
      false,
    );
  });

  it("generates tsconfig.build.json for library package", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-lib",
      type: "library",
      description: "My library",
      framework: "none",
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(
      true,
    );
  });

  it("generates CLI file when withCli is true", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-cli",
      type: "tool-ts",
      description: "My CLI",
      framework: "none",
      withStorybook: false,
      withCli: true,
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("cli.ts"))).toBe(true);
  });

  it("generates CSS package with index.css", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-styles",
      type: "css",
      description: "My styles",
      framework: "none",
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("index.css"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

    expect(writePaths.some((p) => p.endsWith("index.ts"))).toBe(false);
    expect(writePaths.some((p) => p.endsWith("tsconfig.json"))).toBe(false);
  });

  it("creates directory structure using short name", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-pkg",
      type: "tool-ts",
      description: "",
      framework: "none",
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const mkdirPaths = result.effects
      .filter((e) => e._tag === "MakeDir")
      .map((e) => (e as { path: string }).path);

    expect(mkdirPaths.some((p) => p === "my-pkg")).toBe(true);
    expect(mkdirPaths.some((p) => p.endsWith("src"))).toBe(true);
  });
});

describe("generated manifest", () => {
  const libraryAnswers: PackageAnswers = {
    name: "@canonical/my-lib",
    type: "library",
    description: "My library",
    framework: "none",
    withStorybook: false,
    withCli: false,
    withPrTemplate: false,
    runInstall: false,
  };

  it("declares main for a library, so summon can discover the package", () => {
    // `processPackage` in @canonical/summon-core reads `main` and returns
    // early when it is absent; `module` and `types` are never consulted.
    expect(renderManifest(libraryAnswers).main).toBe("dist/esm/index.js");
  });

  it("declares module, types and an exports map for a library", () => {
    const manifest = renderManifest(libraryAnswers);

    expect(manifest.module).toBe("dist/esm/index.js");
    expect(manifest.types).toBe("dist/types/index.d.ts");
    expect(manifest.exports).toEqual({
      ".": {
        types: "./dist/types/index.d.ts",
        import: "./dist/esm/index.js",
      },
    });
  });

  it("builds a library with the tsconfig the generator emits", () => {
    expect(renderManifest(libraryAnswers).scripts.build).toBe(
      "tsc -p tsconfig.build.json",
    );
  });

  it("declares webarchitect wherever check:webarchitect is emitted", () => {
    const manifest = renderManifest(libraryAnswers);

    expect(manifest.scripts["check:webarchitect"]).toBeDefined();
    expect(manifest.devDependencies["@canonical/webarchitect"]).toBe(
      `^${pkg.version}`,
    );
  });

  it("ranges @canonical/* dependencies on the generator's own version", () => {
    // The host repository's version says nothing about which versions of
    // @canonical/* exist on npm, so it must not leak into the ranges.
    const manifest = renderManifest(libraryAnswers, {
      isMonorepo: true,
      version: "0.0.1",
    });

    expect(manifest.devDependencies["@canonical/biome-config"]).toBe(
      `^${pkg.version}`,
    );
    expect(manifest.devDependencies["@canonical/typescript-config"]).toBe(
      `^${pkg.version}`,
    );
  });
});

describe("framework template sets", () => {
  const library: PackageAnswers = {
    name: "@canonical/my-ui",
    type: "library",
    description: "My UI",
    framework: "none",
    withStorybook: false,
    withCli: false,
    withPrTemplate: false,
    runInstall: false,
  };

  it("emits a react sample component and its test", () => {
    const paths = generatedPaths({ ...library, framework: "react" });

    expect(paths).toEqual(
      expect.arrayContaining([
        "my-ui/package.json",
        "my-ui/tsconfig.json",
        "my-ui/tsconfig.build.json",
        "my-ui/biome.json",
        "my-ui/vitest.config.ts",
        "my-ui/src/index.ts",
        "my-ui/src/Example/index.ts",
        "my-ui/src/Example/types.ts",
        "my-ui/src/Example/Example.tsx",
        "my-ui/src/Example/Example.test.tsx",
        "my-ui/README.md",
      ]),
    );
  });

  it("emits the full @sveltejs/package toolchain for a svelte library", () => {
    const paths = generatedPaths({ ...library, framework: "svelte" });

    expect(paths).toEqual(
      expect.arrayContaining([
        "my-ui/package.json",
        "my-ui/svelte.config.js",
        "my-ui/vite.config.ts",
        "my-ui/tsconfig.json",
        "my-ui/tsconfig.build.json",
        "my-ui/biome.json",
        "my-ui/vitest-setup-client.ts",
        "my-ui/src/lib/index.ts",
        "my-ui/src/lib/greeting.ts",
        "my-ui/src/lib/greeting.test.ts",
        "my-ui/src/lib/Example/index.ts",
        "my-ui/src/lib/Example/types.ts",
        "my-ui/src/lib/Example/Example.svelte",
        "my-ui/src/lib/Example/Example.ssr.test.ts",
        "my-ui/src/lib/Example/Example.svelte.test.ts",
        "my-ui/README.md",
      ]),
    );
    // svelte-package reads src/lib; nothing lands directly in src/.
    expect(paths).not.toContain("my-ui/src/index.ts");
    expect(paths).not.toContain("my-ui/vitest.config.ts");
  });

  it("ships one runnable test in every TypeScript arm", () => {
    // `vitest run` exits non-zero when it finds no test files, so a scaffold
    // whose `bun run test` passes is a scaffold that ships a test.
    for (const framework of ["none", "react", "svelte"] as const) {
      const paths = generatedPaths({ ...library, framework });
      expect(paths.some((p) => p.includes(".test."))).toBe(true);
    }
  });

  it("warns and coerces instead of throwing on an impossible combination", () => {
    const result = dryRun(
      generator.generate({
        ...library,
        type: "tool-ts",
        framework: "react",
      }),
    );
    const warnings = result.effects.filter(
      (e) => e._tag === "Log" && (e as { level?: string }).level === "warn",
    );

    expect(warnings).toHaveLength(1);
    // …and the run still produces the plain tool-ts package, rather than
    // aborting: no build config, and the sample module rather than a
    // component tree.
    const paths = generatedPaths({
      ...library,
      type: "tool-ts",
      framework: "react",
    });
    expect(paths).toContain("my-ui/src/index.ts");
    expect(paths).toContain("my-ui/src/index.test.ts");
    expect(paths.some((p) => p.endsWith(".tsx"))).toBe(false);
    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(false);
  });

  it("coerces svelte + --with-cli to a svelte library with no bin", () => {
    const paths = generatedPaths({
      ...library,
      framework: "svelte",
      withCli: true,
    });

    expect(paths.some((p) => p.endsWith("cli.ts"))).toBe(false);
    expect(paths).toContain("my-ui/src/lib/Example/Example.svelte");
  });
});

describe("generated manifest — validity matrix", () => {
  // Every supported flag combination must render parseable JSON whose
  // scripts, dependencies, and published files agree with each other. This is
  // the class of breakage effect-count assertions can never catch (a trailing
  // comma, a script referencing an undeclared binary, a dangling bin path).
  const base = {
    name: "@canonical/my-pkg",
    description: "A package",
    withPrTemplate: false,
    runInstall: false,
  } as const;
  const types = ["tool-ts", "library", "css"] as const;
  const frameworks = ["none", "react", "svelte"] as const;
  const bools = [false, true] as const;

  const combos = types.flatMap((type) =>
    frameworks.flatMap((framework) =>
      bools.flatMap((withStorybook) =>
        bools.map((withCli) => ({ type, framework, withStorybook, withCli })),
      ),
    ),
  );

  it.each(combos)("renders a consistent manifest for %j", ({
    type,
    framework,
    withStorybook,
    withCli,
  }) => {
    // renderManifest JSON.parses — an unparseable render fails here.
    const answers = {
      ...base,
      type,
      framework,
      withStorybook,
      withCli,
    };
    const manifest = renderManifest(answers);
    // Coercions the guard applies before any template sees the answers.
    const isSvelte = framework === "svelte" && type === "library";
    const hasCli = withCli && !isSvelte;
    const devDependencies = manifest.devDependencies ?? {};
    const allDependencies = {
      ...devDependencies,
      ...(manifest.dependencies ?? {}),
    };

    // Scripts must not reference binaries the manifest does not declare.
    if (manifest.scripts["check:webarchitect"] !== undefined) {
      expect(allDependencies["@canonical/webarchitect"]).toBeDefined();
    }
    expect(manifest.scripts.storybook !== undefined).toBe(withStorybook);
    if (withStorybook) {
      expect(manifest.scripts["build:storybook"]).toBeDefined();
      expect(allDependencies.storybook).toBeDefined();
      expect(allDependencies["@canonical/storybook-config"]).toBeDefined();
      expect(allDependencies["@canonical/styles-debug"]).toBeDefined();
      if (isSvelte) {
        expect(allDependencies["@storybook/svelte-vite"]).toBeDefined();
        expect(allDependencies["@storybook/addon-svelte-csf"]).toBeDefined();
      } else {
        expect(allDependencies["@storybook/react-vite"]).toBeDefined();
        // The react renderer needs react even when the package itself is not
        // a react package.
        expect(allDependencies.react).toBeDefined();
        expect(allDependencies["react-dom"]).toBeDefined();
      }
    }

    // Every test runner named by a script must be installable.
    if (manifest.scripts.test?.includes("vitest")) {
      expect(allDependencies.vitest).toBeDefined();
    }
    if (isSvelte) {
      expect(manifest.scripts.build).toContain("svelte-package");
      expect(allDependencies["@sveltejs/package"]).toBeDefined();
      expect(manifest.scripts["check:ts"]).toContain("svelte-check");
      expect(allDependencies["svelte-check"]).toBeDefined();
      expect(manifest.peerDependencies?.svelte).toBeDefined();
    }

    // A bin entry must point inside the published file set.
    if (hasCli && type !== "css") {
      const binPath = Object.values(manifest.bin ?? {})[0];
      expect(binPath).toBeDefined();
      expect(
        manifest.files.some((dir) => (binPath as string).startsWith(`${dir}/`)),
      ).toBe(true);
    } else {
      expect(manifest.bin).toBeUndefined();
    }
  });
});
