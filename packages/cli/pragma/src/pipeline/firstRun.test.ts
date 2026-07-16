import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ensureFirstRun from "./firstRun.js";

let xdg: string;
let savedXdg: string | undefined;
let lines: string[];

const write = (line: string) => {
  lines.push(line);
};

beforeEach(() => {
  savedXdg = process.env.XDG_CONFIG_HOME;
  xdg = mkdtempSync(join(tmpdir(), "pragma-firstrun-"));
  process.env.XDG_CONFIG_HOME = xdg;
  lines = [];
});

afterEach(() => {
  process.env.XDG_CONFIG_HOME = savedXdg;
  rmSync(xdg, { recursive: true, force: true });
});

const configPath = () => join(xdg, "pragma", "config.json");

describe("ensureFirstRun", () => {
  it("creates the global config with defaults and greets on first run", async () => {
    await ensureFirstRun(write);

    expect(existsSync(configPath())).toBe(true);
    expect(JSON.parse(readFileSync(configPath(), "utf-8"))).toEqual({});

    const text = lines.join("\n");
    expect(text).toContain("pre-release pragma CLI");
    expect(text).toContain("github.com/canonical/pragma");
    expect(text).toContain(configPath());
    expect(text).toContain("pragma.config.json");
  });

  it("is silent and leaves the config untouched on subsequent runs", async () => {
    await ensureFirstRun(write);
    lines = [];

    await ensureFirstRun(write);

    expect(lines).toEqual([]);
    expect(readFileSync(configPath(), "utf-8")).toBe("{}\n");
  });

  it("never overwrites an existing config", async () => {
    await ensureFirstRun(write);
    const custom = '{ "channel": "experimental" }\n';
    const { writeFileSync } = await import("node:fs");
    writeFileSync(configPath(), custom);
    lines = [];

    await ensureFirstRun(write);

    expect(readFileSync(configPath(), "utf-8")).toBe(custom);
    expect(lines).toEqual([]);
  });

  it("degrades to a warning instead of throwing when the config cannot be created", async () => {
    // Point XDG at a path whose parent is a FILE, so mkdir must fail.
    const blocker = join(xdg, "blocker");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(blocker, "not a directory");
    process.env.XDG_CONFIG_HOME = join(blocker, "nested");

    await expect(ensureFirstRun(write)).resolves.toBeUndefined();
    expect(
      lines.some((l) =>
        l.includes("could not create the global pragma config"),
      ),
    ).toBe(true);
  });
});
