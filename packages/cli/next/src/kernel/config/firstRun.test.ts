import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureFirstRun, firstRunTask } from "./firstRun.js";
import { globalConfigPath } from "./paths.js";

const originalConfigHome = process.env.XDG_CONFIG_HOME;

function freshConfigHome(): void {
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma2-first-"));
}

afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
});

describe("first run", () => {
  it("greets on stderr and seeds the global config", async () => {
    freshConfigHome();
    const path = globalConfigPath();
    const lines: string[] = [];

    await ensureFirstRun((line) => lines.push(line));

    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe("{}\n");
    expect(lines[0]).toContain("Hello!");
    expect(lines.some((line) => line.includes(path))).toBe(true);
    // Snapshot the note with the volatile path masked.
    expect(
      lines.map((line) => line.replace(path, "<CONFIG>")),
    ).toMatchSnapshot();
  });

  it("is idempotent — no greeting when the config already exists", async () => {
    freshConfigHome();
    await ensureFirstRun(() => {});

    const second: string[] = [];
    await ensureFirstRun((line) => second.push(line));
    expect(second).toEqual([]);

    const task = firstRunTask();
    expect(task).toBeDefined();
  });

  it("tolerates a creation failure with a single warning", async () => {
    freshConfigHome();
    // Make the pragma config directory path a file so mkdir fails.
    writeFileSync(join(process.env.XDG_CONFIG_HOME as string, "pragma"), "x");
    const lines: string[] = [];

    await expect(
      ensureFirstRun((line) => lines.push(line)),
    ).resolves.toBeUndefined();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Warning: could not create");
  });
});
