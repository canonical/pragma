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
import { BIN_NAME, PROGRAM_DESCRIPTION } from "../../constants.js";
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
    expect(config.packs).toHaveLength(3); // from defaults

    expect(origins).toMatchObject({
      tier: "project",
      channel: "global",
      detail: "project", // project wins over global
      packs: "default",
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

  it("replaces packs wholesale from the project layer", async () => {
    freshXdg();
    const dir = projectWith('export default { packs: ["@acme/only"] };');

    const { config, origins } = await readConfig(dir);

    expect(config.packs).toEqual(["@acme/only"]);
    expect(origins.packs).toBe("project");
  });

  it("accepts a layer's identity fields and gives them NO effect", async () => {
    // Identity is read from `pragma.conf.ts` by `src/constants.ts` at module
    // load, so a layer declaring it can only ever be silent. The validator
    // still accepts the keys (the distribution config shares the schema), and
    // the merged config now carries neither the value nor a provenance for it
    // — which is what `config show` used to report and did not honour.
    freshXdg();
    writeGlobal('{"help":"Global help"}');
    const dir = projectWith(
      'export default { name: "acme", colophon: { markdown: "By Acme." }, issuesUrl: "https://acme.test/issues", tier: "core" };',
    );

    const { config, origins } = await readConfig(dir);

    expect(config).not.toHaveProperty("name");
    expect(config).not.toHaveProperty("help");
    expect(config).not.toHaveProperty("colophon");
    expect(config).not.toHaveProperty("issuesUrl");
    expect(origins).not.toHaveProperty("name");
    // The positive control, from the SAME project file: a layerable field
    // declared beside them IS merged and reported, so the assertions above
    // cannot pass by the project layer having failed to load at all.
    expect(config.tier).toBe("core");
    expect(origins.tier).toBe("project");
    // And the projected identity is unmoved by any of it.
    expect(BIN_NAME).toBe("pragma");
    expect(PROGRAM_DESCRIPTION).not.toBe("Global help");
  });

  it("merges the completion policy into the effective config", async () => {
    freshXdg();
    const dir = projectWith(
      "export default { completion: { minChars: 3, families: { skill: false } } };",
    );

    const { config } = await readConfig(dir);

    expect(config.completion).toEqual({
      minChars: 3,
      families: { skill: false },
    });
  });
});

describe("`detail` — a closed enum at load", () => {
  it("a project config declaring an unknown level throws CONFIG_ERROR naming the file and the three levels", async () => {
    freshXdg();
    // Before the enum, `detail: "banana"` passed validation, was reported as
    // `[project]` by `config show`, and silently rendered at `standard`.
    const dir = projectWith('export default { detail: "banana" };');
    const path = join(dir, "pragma.config.ts");

    let caught: unknown;
    try {
      await evaluateProjectConfig(path);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    const message = (caught as { message: string }).message;
    expect(message).toContain(path);
    expect(message).toContain("detail");
    for (const level of ["summary", "standard", "detailed"]) {
      expect(message).toContain(level);
    }
  });

  it("a global JSON declaring an unknown level throws the same loud error", () => {
    freshXdg();
    writeGlobal('{"detail": "digest"}');

    let caught: unknown;
    try {
      readGlobalConfig();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    const message = (caught as { message: string }).message;
    expect(message).toContain(globalConfigPath());
    for (const level of ["summary", "standard", "detailed"]) {
      expect(message).toContain(level);
    }
  });
});

describe("legacy config shapes — loud rename/removal errors", () => {
  it("a project config declaring `packages` throws CONFIG_ERROR naming the rename", async () => {
    freshXdg();
    // Unknown keys are stripped by the schema, so the legacy key must be
    // DETECTED — a silent ignore would boot the default packs while the user
    // believes their own list is in force.
    const dir = projectWith('export default { packages: ["@acme/only"] };');
    const path = join(dir, "pragma.config.ts");

    let caught: unknown;
    try {
      await evaluateProjectConfig(path);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    expect((caught as { message: string }).message).toContain(
      `Invalid config in ${path}: the "packages" field was renamed to "packs". The entry shape is unchanged.`,
    );
    // The recovery carries the path; the message drops the instruction.
    expect(
      (caught as { recovery?: { message: string } }).recovery?.message,
    ).toBe(`In ${path}, rename "packages:" to "packs".`);
  });

  it("a legacy global JSON declaring `packages` throws the same rename error", () => {
    freshXdg();
    writeGlobal('{"packages": []}');

    let caught: unknown;
    try {
      readGlobalConfig();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    expect((caught as { message: string }).message).toContain(
      'the "packages" field was renamed to "packs". The entry shape is unchanged.',
    );
  });

  it("a project layer's `generators` is accepted and IGNORED, like the identity fields", async () => {
    freshXdg();
    // It came back load-bearing, but only at BUILD time: `scripts/build.ts`
    // turns it into the literal import specifiers the bundler needs. No config
    // layer can change which modules an already-compiled binary carries, so a
    // project declaring it must be accepted (not an error) and must not reach
    // the effective config — the identity-field precedent exactly.
    const dir = projectWith(
      'export default { generators: [{ name: "@acme/gen", nouns: { gen: { key: "gen", summary: "Scaffold a thing.", useWhen: "Scaffolding a thing" } } }] };',
    );
    const layer = await evaluateProjectConfig(join(dir, "pragma.config.ts"));
    expect(layer).toHaveProperty("generators");

    const { config } = await readConfig(dir);
    expect(config).not.toHaveProperty("generators");
  });

  it("a global JSON declaring `generators` is accepted the same way", () => {
    freshXdg();
    writeGlobal(
      '{"generators": [{"name": "@acme/gen", "nouns": {"gen": {"key": "gen", "summary": "Scaffold a thing.", "useWhen": "Scaffolding a thing"}}}]}',
    );
    expect(readGlobalConfig().values).toHaveProperty("generators");
  });

  it("a `generators` noun declaring neither a key nor an axis is a CONFIG_ERROR", () => {
    freshXdg();
    writeGlobal(
      '{"generators": [{"name": "@acme/gen", "nouns": {"gen": {"summary": "Scaffold a thing.", "useWhen": "Scaffolding a thing"}}}]}',
    );
    expect(() => readGlobalConfig()).toThrow(/CONFIG_ERROR|generators|key/);
  });

  it("a `generators` noun MIXING a key with an axis is a CONFIG_ERROR", () => {
    freshXdg();
    // The first refinement compared `key !== undefined` against
    // `keyPrefix && axis`, so this read as `true !== false` and was ACCEPTED
    // while its own message said "not both". The build then dropped the prompt
    // the ignored `axis` names: `{key: "package", axis: "name"}` emitted a
    // `create package` surface with no `name` param at all — a required
    // positional deleted, with no enum flag to replace it and nothing red.
    writeGlobal(
      '{"generators": [{"name": "@acme/gen", "nouns": {"gen": {"key": "gen", "axis": "name", "summary": "Scaffold a thing.", "useWhen": "Scaffolding a thing"}}}]}',
    );
    expect(() => readGlobalConfig()).toThrow(/CONFIG_ERROR|mixture/);
  });

  it("a `generators` noun mixing a key with a keyPrefix is a CONFIG_ERROR", () => {
    freshXdg();
    writeGlobal(
      '{"generators": [{"name": "@acme/gen", "nouns": {"gen": {"key": "gen", "keyPrefix": "gen", "summary": "Scaffold a thing.", "useWhen": "Scaffolding a thing"}}}]}',
    );
    expect(() => readGlobalConfig()).toThrow(/CONFIG_ERROR|mixture/);
  });

  it("a removed `completion.caseSensitive` throws CONFIG_ERROR naming the field", async () => {
    freshXdg();
    // The field was validated and read by NOTHING. Removing it silently would
    // leave a config author believing case-sensitivity is in force; the schema
    // strips unknown keys, so the removal must be DETECTED before validation.
    const dir = projectWith(
      "export default { completion: { minChars: 3, caseSensitive: true } };",
    );
    const path = join(dir, "pragma.config.ts");

    let caught: unknown;
    try {
      await evaluateProjectConfig(path);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    const message = (caught as { message: string }).message;
    expect(message).toContain(path);
    expect(message).toContain('"completion.caseSensitive"');
    expect(message).toContain("removed");
    expect(
      (caught as { recovery?: { message: string } }).recovery?.message,
    ).toBe(`In ${path}, delete "caseSensitive" from "completion".`);
  });

  it("a global JSON still setting completion.caseSensitive throws the same removal error", () => {
    freshXdg();
    writeGlobal('{"completion": {"caseSensitive": false}}');

    let caught: unknown;
    try {
      readGlobalConfig();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    expect((caught as { message: string }).message).toContain(
      '"completion.caseSensitive"',
    );
  });

  it("a TOP-LEVEL `caseSensitive` key is an ordinary unknown key, not the removed field", async () => {
    freshXdg();
    // The detection reads exactly `completion.caseSensitive` — a stray
    // top-level key keeps the forward-compatible unknown-key stripping.
    const dir = projectWith(
      "export default { caseSensitive: true, tier: 'core' };",
    );
    const path = join(dir, "pragma.config.ts");

    await expect(evaluateProjectConfig(path)).resolves.toEqual({
      tier: "core",
    });
  });

  it("a `packages` key NESTED under another field does NOT trip the detection", async () => {
    freshXdg();
    // The rename detection is deliberately SHALLOW (top-level keys only): a
    // `packages` key inside `prefixes` is a namespace prefix named `packages`,
    // not the legacy field. Pin that against a future "helpful" deep check,
    // which would false-positive here.
    const dir = projectWith(
      'export default { prefixes: { packages: "https://example.com/packages/" } };',
    );
    const path = join(dir, "pragma.config.ts");

    await expect(evaluateProjectConfig(path)).resolves.toEqual({
      prefixes: { packages: "https://example.com/packages/" },
    });
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

  it("a config that throws while evaluating is a named CONFIG_ERROR, not INTERNAL_ERROR", async () => {
    freshXdg();
    // A malformed project config: references an undefined symbol → the module
    // throws at evaluation. Left unwrapped this collapsed to INTERNAL_ERROR
    // ("please report this issue") on EVERY command that reads config.
    const dir = projectWith("export default { tier: definitelyNotDefined };");
    const path = join(dir, "pragma.config.ts");

    let caught: unknown;
    try {
      await evaluateProjectConfig(path);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "CONFIG_ERROR" });
    // Names the offending file so the user knows WHAT to fix.
    expect((caught as { message: string }).message).toContain(path);
    expect(
      (caught as { recovery?: { message: string } }).recovery?.message,
    ).not.toContain("report this issue");
  });
});
