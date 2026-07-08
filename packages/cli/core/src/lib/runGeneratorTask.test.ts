import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parallel, readFile, writeFile } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import runGeneratorTask from "./runGeneratorTask.js";

describe("runGeneratorTask", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "run-generator-task-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs the task in the given cwd and records a journal, restoring cwd after", async () => {
    const { journal } = await runGeneratorTask(writeFile("out.txt", "hello"), {
      cwd: dir,
    });

    expect(readFileSync(join(dir, "out.txt"), "utf-8")).toBe("hello");
    expect(journal.entries.map((e) => e.id.kind)).toEqual(["WriteFile"]);
    expect(process.cwd()).toBe(originalCwd);
  });

  it("does not chdir when no cwd is given, running in the process directory", async () => {
    process.chdir(dir);
    const { journal } = await runGeneratorTask(writeFile("here.txt", "x"));

    expect(readFileSync(join(dir, "here.txt"), "utf-8")).toBe("x");
    expect(journal.entries).toHaveLength(1);
  });

  it("does not chdir when the given cwd already equals the process directory", async () => {
    process.chdir(dir);
    const { journal } = await runGeneratorTask(writeFile("same.txt", "x"), {
      cwd: dir,
    });

    expect(readFileSync(join(dir, "same.txt"), "utf-8")).toBe("x");
    expect(journal.entries).toHaveLength(1);
    expect(process.cwd()).toBe(dir);
  });

  it("restores the previous cwd even when the task throws", async () => {
    await expect(
      runGeneratorTask(readFile(join(dir, "absent.txt")), { cwd: dir }),
    ).rejects.toThrow();
    expect(process.cwd()).toBe(originalCwd);
  });

  it("replays a supplied journal without touching the filesystem", async () => {
    const file = join(dir, "recorded.txt");
    writeFileSync(file, "v1");

    const recorded = await runGeneratorTask(readFile(file));
    expect(recorded.value).toBe("v1");

    // Change the world; a replay must ignore it and return the recorded value.
    writeFileSync(file, "v2");
    const replayed = await runGeneratorTask(readFile(file), {
      journal: recorded.journal,
    });
    expect(replayed.value).toBe("v1");
  });

  it("fails closed on a task the journal cannot represent", async () => {
    // A Parallel effect has no positional identity in a linear journal.
    await expect(
      runGeneratorTask(parallel([writeFile("a.txt", "a")]), { cwd: dir }),
    ).rejects.toThrow(/Parallel/);
    expect(process.cwd()).toBe(originalCwd);
  });
});
