import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateProjectConfig } from "./evaluateProjectConfig.js";
import { findProjectConfig } from "./findProjectConfig.js";
import { configCacheDir, globalConfigPath } from "./paths.js";
import { readConfig } from "./readConfig.js";

const originalConfigHome = process.env.XDG_CONFIG_HOME;
const originalStateHome = process.env.XDG_STATE_HOME;

/** Point XDG at fresh temp dirs so each test gets isolated global/cache layers. */
function freshXdg(): void {
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma2-cfg-"));
  process.env.XDG_STATE_HOME = mkdtempSync(join(tmpdir(), "pragma2-state-"));
}

/** Write the global config JSON. */
function writeGlobal(json: string): void {
  const path = globalConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

/** Create a temp project directory with the given `pragma.config.ts` body. */
function projectWith(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma2-proj-"));
  writeFileSync(join(dir, "pragma.config.ts"), body);
  return dir;
}

afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
  process.env.XDG_STATE_HOME = originalStateHome;
});

describe("readConfig — layering + provenance", () => {
  it("merges defaults < global < project per field", async () => {
    freshXdg();
    writeGlobal('{"channel":"experimental","detail":"summary"}');
    const dir = projectWith(
      'export default { tier: "core", detail: "detailed" };',
    );

    const { config, origins, project, global } = await readConfig(dir);

    expect(config.tier).toBe("core");
    expect(config.channel).toBe("experimental");
    expect(config.detail).toBe("detailed");
    expect(config.packages).toHaveLength(3); // from defaults

    expect(origins).toMatchObject({
      tier: "project",
      channel: "global",
      detail: "project", // project wins over global
      packages: "default",
    });
    expect(project.exists).toBe(true);
    expect(global.exists).toBe(true);
  });

  it("falls back to defaults when no layer sets a field", async () => {
    freshXdg();
    const dir = mkdtempSync(join(tmpdir(), "pragma2-empty-"));

    const { config, origins, project } = await readConfig(dir);

    expect(config.channel).toBe("normal");
    expect(origins.channel).toBe("default");
    expect(project.exists).toBe(false);
  });

  it("replaces packages wholesale from the project layer", async () => {
    freshXdg();
    const dir = projectWith('export default { packages: ["@acme/only"] };');

    const { config, origins } = await readConfig(dir);

    expect(config.packages).toEqual(["@acme/only"]);
    expect(origins.packages).toBe("project");
  });
});

describe("findProjectConfig — walk-up", () => {
  it("finds a config in an ancestor directory", () => {
    const root = projectWith("export default {};");
    const nested = join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    expect(findProjectConfig(nested)).toBe(join(root, "pragma.config.ts"));
  });
});

describe("evaluateProjectConfig — content-hash cache", () => {
  it("serves the cached value on a hash hit (no re-evaluation)", async () => {
    freshXdg();
    const dir = projectWith('export default { channel: "normal" };');
    const path = join(dir, "pragma.config.ts");
    const source = 'export default { channel: "normal" };';
    const hash = createHash("sha256").update(source).digest("hex");

    // Seed a *different* value at the source's hash — a genuine evaluation
    // would return "normal", so returning "experimental" proves a cache hit.
    mkdirSync(configCacheDir(), { recursive: true });
    writeFileSync(
      join(configCacheDir(), `${hash}.json`),
      JSON.stringify({ channel: "experimental" }),
    );

    expect(await evaluateProjectConfig(path)).toEqual({
      channel: "experimental",
    });
  });

  it("evaluates and writes the cache on a miss", async () => {
    freshXdg();
    const dir = projectWith('export default { tier: "core" };');
    const path = join(dir, "pragma.config.ts");

    const config = await evaluateProjectConfig(path);
    expect(config).toEqual({ tier: "core" });

    // A second evaluation returns the same (now warm) value.
    expect(await evaluateProjectConfig(path)).toEqual({ tier: "core" });
  });
});
