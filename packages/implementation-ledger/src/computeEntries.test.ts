import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  computeEntryForPackage,
  discoverAnnotatedPackages,
  findRootDir,
  loadRootConfig,
} from "./computeEntries.js";
import { resolveBarrelExports } from "./resolveBarrelExports.js";
import type { RootConfig } from "./types.js";

let rootDir: string;

const rootConfig: RootConfig = {
  prefix: { short: "ds", namespace: "https://ds.canonical.com/" },
  defaults: { patterns: { react: "src/**/*.tsx", typescript: "src/**/*.ts" } },
};

async function write(path: string, content: string): Promise<void> {
  await mkdir(join(rootDir, path, ".."), { recursive: true });
  await writeFile(join(rootDir, path), content, "utf-8");
}

beforeAll(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "ledger-fixture-"));

  await writeFile(
    join(rootDir, "ds.config.json"),
    JSON.stringify(rootConfig),
    "utf-8",
  );
  await writeFile(
    join(rootDir, "package.json"),
    JSON.stringify({ name: "fixture-root", workspaces: ["packages/*"] }),
    "utf-8",
  );

  const pkg = "packages/ui";
  await mkdir(join(rootDir, pkg, "src/Button"), { recursive: true });
  await mkdir(join(rootDir, pkg, "src/Hidden"), { recursive: true });

  await write(
    `${pkg}/package.json`,
    JSON.stringify({ name: "@fixture/ui", version: "3.1.0" }),
  );
  await write(
    `${pkg}/design-system.json`,
    JSON.stringify({ platform: "react" }),
  );

  await write(
    `${pkg}/src/Button/Button.tsx`,
    [
      "/**",
      " * @implements ds:global.component.button",
      " */",
      "const Button = () => null;",
      "export default Button;",
    ].join("\n"),
  );
  await write(
    `${pkg}/src/Button/index.ts`,
    'export { default as Button } from "./Button.js";',
  );
  await write(
    `${pkg}/src/Hidden/Hidden.tsx`,
    [
      "/** @implements ds:global.component.hidden@9.0.0 [draft] */",
      "const Hidden = () => null;",
      "export default Hidden;",
    ].join("\n"),
  );
  await write(
    `${pkg}/src/Menu.tsx`,
    [
      "/** @implements ds:global.component.contextual_menu@4.2.0 */",
      "const ContextualMenu = () => null;",
      "export default ContextualMenu;",
      "// The same block annotated from a types file:",
      "/** @implements dso:global.component.contextual_menu */",
      "export const ignoredOtherPrefix = 1;",
    ].join("\n"),
  );
  await write(
    `${pkg}/src/Heading.stories.tsx`,
    [
      "/** @implements ds:global.component.heading */",
      "const meta = { title: 'Heading' };",
      "export default meta;",
    ].join("\n"),
  );
  await write(
    `${pkg}/src/index.ts`,
    [
      'export * from "./Button/index.js";',
      'export { default as ContextualMenu } from "./Menu.js";',
    ].join("\n"),
  );

  // A workspace package without design-system.json must be ignored.
  await mkdir(join(rootDir, "packages/plain"), { recursive: true });
  await write(
    "packages/plain/package.json",
    JSON.stringify({ name: "@fixture/plain", version: "1.0.0" }),
  );
});

afterAll(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe("discovery", () => {
  it("finds the monorepo root from a nested directory", async () => {
    expect(await findRootDir(join(rootDir, "packages/ui/src"))).toBe(rootDir);
    expect(await loadRootConfig(rootDir)).toEqual(rootConfig);
  });

  it("discovers only packages with a design-system.json", async () => {
    const packages = await discoverAnnotatedPackages(rootDir);
    expect(packages.map((pkg) => pkg.packageName)).toEqual(["@fixture/ui"]);
    expect(packages[0].packageVersion).toBe("3.1.0");
    expect(packages[0].relativePath).toBe("packages/ui");
    // Normalized (no trailing slash) so --package path filtering works.
    expect(packages[0].path).toBe(join(rootDir, "packages/ui"));
  });
});

describe("resolveBarrelExports", () => {
  it("follows export chains through the public barrel", async () => {
    const barrel = await resolveBarrelExports(join(rootDir, "packages/ui"));
    expect(barrel.names.has("Button")).toBe(true);
    expect(barrel.names.has("ContextualMenu")).toBe(true);
    expect(barrel.names.has("Hidden")).toBe(false);
  });
});

describe("computeEntryForPackage", () => {
  it("computes the full entry for an annotated package", async () => {
    const [pkg] = await discoverAnnotatedPackages(rootDir);
    const computed = await computeEntryForPackage(pkg, rootConfig);

    expect(computed).toBeDefined();
    const entry = computed?.entry;
    expect(entry?.packageName).toBe("@fixture/ui");
    expect(entry?.packageVersion).toBe("3.1.0");

    // Sorted by blockUri; dso:-prefixed annotations are ignored.
    expect(entry?.implementations.map((impl) => impl.blockUri)).toEqual([
      "ds:global.component.button",
      "ds:global.component.contextual_menu",
      "ds:global.component.heading",
      "ds:global.component.hidden",
    ]);

    const [button, menu, heading, hidden] = entry?.implementations ?? [];

    // Defaults to the package version; import verified via the barrel.
    expect(button.blockVersion).toBe("3.1.0");
    expect(button.exportedSymbol).toBe("Button");
    expect(button.importStatement).toBe(
      'import { Button } from "@fixture/ui";',
    );
    expect(button.importVerified).toBe(true);
    expect(button.isDraft).toBe(false);

    // Explicit @4.2.0 override wins over the package version.
    expect(menu.blockVersion).toBe("4.2.0");
    expect(menu.importVerified).toBe(true);

    // Stories files never provide symbols ("meta"); the slug guess is used.
    expect(heading.exportedSymbol).toBe("Heading");
    expect(heading.importVerified).toBe(false);

    // Draft block, version override, not exported from the barrel.
    expect(hidden.blockVersion).toBe("9.0.0");
    expect(hidden.isDraft).toBe(true);
    expect(hidden.exportedSymbol).toBe("Hidden");
    expect(hidden.importVerified).toBe(false);
    expect(
      computed?.warnings.some((warning) => warning.includes('"Hidden"')),
    ).toBe(true);
  });

  it("returns undefined for packages with no valid annotations", async () => {
    const computed = await computeEntryForPackage(
      {
        path: join(rootDir, "packages/plain"),
        relativePath: "packages/plain",
        packageName: "@fixture/plain",
        packageVersion: "1.0.0",
        dsConfig: { platform: "react" },
      },
      rootConfig,
    );
    expect(computed).toBeUndefined();
  });
});
