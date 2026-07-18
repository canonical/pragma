import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runTask } from "@canonical/task/node";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateProjectConfig } from "./evaluateProjectConfig.js";
import { findProjectConfig } from "./findProjectConfig.js";
import { readGlobalConfig } from "./globalConfig.js";
import { configCacheDir, globalConfigPath } from "./paths.js";
import { readConfig } from "./readConfig.js";
import { writeConfigField } from "./writeConfigField.js";

const originalConfigHome = process.env.XDG_CONFIG_HOME;
const originalStateHome = process.env.XDG_STATE_HOME;

/** Point XDG at fresh temp dirs so each test gets isolated global/cache layers. */
function freshXdg(): void {
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma-cfg-"));
  process.env.XDG_STATE_HOME = mkdtempSync(join(tmpdir(), "pragma-state-"));
}

/** Write the global config JSON. */
function writeGlobal(json: string): void {
  const path = globalConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json);
}

/** Create a temp project directory with the given `pragma.config.ts` body. */
function projectWith(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-proj-"));
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
    const dir = mkdtempSync(join(tmpdir(), "pragma-empty-"));

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

describe("global config — corrupt-file recovery", () => {
  /** Backup siblings the recovery created next to the config file. */
  function corruptBackups(): string[] {
    return readdirSync(dirname(globalConfigPath())).filter((f) =>
      f.includes(".corrupt-"),
    );
  }

  it("readGlobalConfig backs up, resets, and degrades to defaults", () => {
    freshXdg();
    writeGlobal("{ this is: not valid json");
    const errs: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        errs.push(String(chunk));
        return true;
      });

    const read = readGlobalConfig();
    spy.mockRestore();

    // Never bricks: degrades to defaults rather than throwing.
    expect(read.values).toEqual({});
    expect(read.exists).toBe(true);
    expect(errs.join("")).toMatch(/not valid JSON/);
    // Never silently discards: the corrupt content is preserved in a backup…
    expect(corruptBackups()).toHaveLength(1);
    // …and the live file self-heals to defaults.
    expect(JSON.parse(readFileSync(globalConfigPath(), "utf-8"))).toEqual({});
  });

  it("writeConfigField backs up a corrupt config before overwriting", async () => {
    freshXdg();
    writeGlobal("{ broken");
    const logs: string[] = [];

    await runTask(writeConfigField("channel", "experimental"), {
      onLog: (_level, message) => logs.push(message),
    });

    expect(corruptBackups()).toHaveLength(1);
    expect(logs.join("")).toMatch(/backed it up/i);
    // The new field is written over the reset defaults — no silent loss.
    expect(JSON.parse(readFileSync(globalConfigPath(), "utf-8"))).toEqual({
      channel: "experimental",
    });
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

describe("evaluateProjectConfig — mtime+VERSION cache", () => {
  it("serves the cached value on a key hit (no re-evaluation)", async () => {
    freshXdg();
    const dir = projectWith('export default { channel: "normal" };');
    const path = join(dir, "pragma.config.ts");

    // Prime the cache with a cold evaluation.
    expect(await evaluateProjectConfig(path)).toEqual({ channel: "normal" });

    // Tamper the single cached entry: a genuine re-evaluation would still read
    // "normal", so returning "experimental" proves the warm path served the
    // cache without re-importing.
    const [cached] = readdirSync(configCacheDir());
    writeFileSync(
      join(configCacheDir(), cached as string),
      JSON.stringify({ channel: "experimental" }),
    );

    expect(await evaluateProjectConfig(path)).toEqual({
      channel: "experimental",
    });
  });

  it("invalidates the cache when the entry file's mtime changes", async () => {
    freshXdg();
    const dir = projectWith('export default { tier: "core" };');
    const path = join(dir, "pragma.config.ts");

    // Prime, then poison the primed entry so a stale-key read would be visible.
    await evaluateProjectConfig(path);
    const [primed] = readdirSync(configCacheDir());
    writeFileSync(
      join(configCacheDir(), primed as string),
      JSON.stringify({ tier: "STALE" }),
    );

    // Bump the entry's mtime (content unchanged): the key changes, so the
    // poisoned entry is bypassed and the real value is recomputed.
    const later = new Date(Date.now() + 5000);
    utimesSync(path, later, later);

    expect(await evaluateProjectConfig(path)).toEqual({ tier: "core" });
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
