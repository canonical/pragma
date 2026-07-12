import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import readConfig from "./readConfig.js";
import writeConfig from "./writeConfig.js";

/** Write to `<dir>/pragma.config.json` — these tests pin file mechanics. */
function writeConfigLocal(
  dir: string,
  update: Parameters<typeof writeConfig>[1],
): string {
  return writeConfig(dir, update, "local");
}

describe("readConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-config-"));
    // Bound the project-config walk at this fixture root so a stray
    // pragma.config.json in an ancestor directory can never leak in.
    mkdirSync(join(dir, ".git"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = readConfig(dir);
    expect(config).toEqual({ tier: undefined, channel: "normal" });
  });

  it("parses tier and channel", () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps/lxd","channel":"experimental"}',
    );
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("experimental");
  });

  it("parses tier only, defaults channel to normal", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"global"}');
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("normal");
  });

  it("parses channel only, tier is undefined", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"prerelease"}');
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("prerelease");
  });

  it("handles empty file", () => {
    writeFileSync(join(dir, "pragma.config.json"), "");
    const config = readConfig(dir);
    expect(config).toEqual({ tier: undefined, channel: "normal" });
  });

  it("throws PragmaError on invalid channel", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"aggressive"}');
    expect(() => readConfig(dir)).toThrow(PragmaError);
    try {
      readConfig(dir);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("CONFIG_ERROR");
      expect((e as PragmaError).validOptions).toEqual([
        "normal",
        "experimental",
        "prerelease",
      ]);
    }
  });

  it("ignores non-string tier", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":42}');
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
  });

  describe("packages field", () => {
    it("parses string-only packages array", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({
          packages: ["@canonical/design-system", "@canonical/code-standards"],
        }),
      );
      const config = readConfig(dir);
      expect(config.packages).toEqual([
        "@canonical/design-system",
        "@canonical/code-standards",
      ]);
    });

    it("parses mixed string and object packages", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({
          packages: [
            "@canonical/design-system",
            {
              name: "@canonical/code-standards",
              source: "file:///home/user/code/code-standards",
            },
          ],
        }),
      );
      const config = readConfig(dir);
      expect(config.packages).toEqual([
        "@canonical/design-system",
        {
          name: "@canonical/code-standards",
          source: "file:///home/user/code/code-standards",
        },
      ]);
    });

    it("parses object without source as npm", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({
          packages: [{ name: "@canonical/design-system" }],
        }),
      );
      const config = readConfig(dir);
      expect(config.packages).toEqual([{ name: "@canonical/design-system" }]);
    });

    it("returns no packages field when absent", () => {
      writeFileSync(join(dir, "pragma.config.json"), '{"tier":"global"}');
      const config = readConfig(dir);
      expect(config.packages).toBeUndefined();
    });

    it("throws on non-array packages", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        '{"packages":"not-an-array"}',
      );
      expect(() => readConfig(dir)).toThrow(PragmaError);
    });

    it("throws on object entry with empty name", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({ packages: [{ name: "" }] }),
      );
      expect(() => readConfig(dir)).toThrow(PragmaError);
    });

    it("throws on invalid source scheme", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({
          packages: [
            { name: "@canonical/ds", source: "https://example.com/foo.tar.gz" },
          ],
        }),
      );
      expect(() => readConfig(dir)).toThrow(PragmaError);
    });

    it("throws on git source without ref", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({
          packages: [
            {
              name: "@canonical/ds",
              source: "git+https://github.com/canonical/ds.git",
            },
          ],
        }),
      );
      expect(() => readConfig(dir)).toThrow(PragmaError);
    });
  });
});

describe("writeConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-config-write-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a new config file with tier", () => {
    writeConfigLocal(dir, { tier: "apps/lxd" });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("normal");
  });

  it("creates a new config file with channel", () => {
    writeConfigLocal(dir, { channel: "experimental" });
    const config = readConfig(dir);
    expect(config.channel).toBe("experimental");
    expect(config.tier).toBeUndefined();
  });

  it("merges tier into existing config", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"channel":"prerelease"}');
    writeConfigLocal(dir, { tier: "global" });
    const config = readConfig(dir);
    expect(config.tier).toBe("global");
    expect(config.channel).toBe("prerelease");
  });

  it("removes tier when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps","channel":"normal"}',
    );
    writeConfigLocal(dir, { tier: undefined });
    const config = readConfig(dir);
    expect(config.tier).toBeUndefined();
    expect(config.channel).toBe("normal");
  });

  it("removes channel when set to undefined", () => {
    writeFileSync(
      join(dir, "pragma.config.json"),
      '{"tier":"apps","channel":"experimental"}',
    );
    writeConfigLocal(dir, { channel: undefined });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps");
    // Channel defaults to "normal" when absent from file
    expect(config.channel).toBe("normal");
  });

  it("round-trips tier and channel through write then read", () => {
    writeConfigLocal(dir, { tier: "apps/lxd", channel: "prerelease" });
    const config = readConfig(dir);
    expect(config.tier).toBe("apps/lxd");
    expect(config.channel).toBe("prerelease");
  });

  it("writes valid empty JSON when all fields removed", () => {
    writeFileSync(join(dir, "pragma.config.json"), '{"tier":"apps"}');
    writeConfigLocal(dir, { tier: undefined });
    const raw = readFileSync(join(dir, "pragma.config.json"), "utf-8");
    expect(raw).toBe("{}\n");
  });

  it("throws on unparseable existing config instead of silently overwriting", () => {
    writeFileSync(join(dir, "pragma.config.json"), "{invalid json");
    expect(() => writeConfigLocal(dir, { tier: "apps" })).toThrow();
  });

  describe("packages field", () => {
    it("writes packages array", () => {
      writeConfigLocal(dir, {
        packages: [
          "@canonical/design-system",
          {
            name: "@canonical/code-standards",
            source: "file:///home/user/code/code-standards",
          },
        ],
      });
      const config = readConfig(dir);
      expect(config.packages).toEqual([
        "@canonical/design-system",
        {
          name: "@canonical/code-standards",
          source: "file:///home/user/code/code-standards",
        },
      ]);
    });

    it("merges packages into existing config without touching tier", () => {
      writeFileSync(join(dir, "pragma.config.json"), '{"tier":"global"}');
      writeConfigLocal(dir, { packages: ["@canonical/design-system"] });
      const config = readConfig(dir);
      expect(config.tier).toBe("global");
      expect(config.packages).toEqual(["@canonical/design-system"]);
    });

    it("removes packages when set to undefined", () => {
      writeFileSync(
        join(dir, "pragma.config.json"),
        JSON.stringify({ packages: ["@canonical/design-system"] }),
      );
      writeConfigLocal(dir, { packages: undefined });
      const config = readConfig(dir);
      expect(config.packages).toBeUndefined();
    });

    it("round-trips packages through write then read", () => {
      const packages = [
        "@canonical/design-system",
        {
          name: "@canonical/anatomy-dsl",
          source: "git+https://github.com/canonical/anatomy-dsl.git#main",
        },
      ];
      writeConfigLocal(dir, { packages });
      const config = readConfig(dir);
      expect(config.packages).toEqual(packages);
    });
  });
});

describe("readConfig — empty packages normalization", () => {
  it("treats an explicitly empty packages list as not configured", () => {
    const dir = mkdtempSync(join(tmpdir(), "pragma-empty-pkgs-"));
    mkdirSync(join(dir, ".git"), { recursive: true });
    writeFileSync(
      join(dir, "pragma.config.json"),
      JSON.stringify({ channel: "normal", packages: [] }),
    );
    const config = readConfig(dir);
    // The field is dropped at parse time so provenance matches the ref
    // resolution behavior (empty list falls back to defaults/global refs).
    expect(config.packages).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });
});
