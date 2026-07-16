import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { staticDirs } from "./preset.js";

const srcDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(srcDir, "..");

interface PackageManifest {
  files: string[];
  exports: Record<string, string>;
  msw?: { workerDirectory: string[] };
}

const readManifest = async (): Promise<PackageManifest> =>
  JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  ) as PackageManifest;

describe("preset", () => {
  it("serves exactly one absolute static directory", () => {
    expect(staticDirs).toHaveLength(1);
    expect(isAbsolute(staticDirs[0])).toBe(true);
  });

  it("resolves to the packaged public directory from the built preset location", async () => {
    const manifest = await readManifest();
    // The offset baked into the module, e.g. "../../public".
    const offset = relative(srcDir, staticDirs[0]);
    // Where the module actually lives once published.
    const builtDir = dirname(
      resolve(packageRoot, manifest.exports["./preset"]),
    );

    expect(resolve(builtDir, offset)).toBe(resolve(packageRoot, "public"));
  });

  it("ships the MSW service worker in the served directory", async () => {
    const manifest = await readManifest();

    expect(existsSync(join(packageRoot, "public/mockServiceWorker.js"))).toBe(
      true,
    );
    expect(manifest.files).toContain("public");
    expect(manifest.msw?.workerDirectory).toContain("public");
  });
});
