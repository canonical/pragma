import { info, pure, writeFile } from "@canonical/task";
import { describe, expect, it } from "vitest";
import runSetupTask from "./runSetupTask.js";

describe("runSetupTask", () => {
  it("returns output result in dry-run mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, { dryRun: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("Dry run");
      expect(text).toContain("/tmp/test.txt");
    }
  });

  it("returns json output in dry-run + json mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, {
      dryRun: true,
      format: "json",
    });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      const parsed = JSON.parse(text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].action).toBe("WriteFile");
    }
  });

  it("returns llm markdown in dry-run + llm mode", async () => {
    const task = writeFile("/tmp/test.txt", "hello");
    const result = await runSetupTask(task, { dryRun: true, llm: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("## Dry Run");
      expect(text).toContain("WriteFile");
    }
  });

  it("returns exit 0 on successful execution with --yes", async () => {
    const task = info("test message");
    const result = await runSetupTask(task, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
  });

  it("returns exit 0 for pure task", async () => {
    const task = pure(undefined);
    const result = await runSetupTask(task, { yes: true });

    expect(result.tag).toBe("exit");
    if (result.tag === "exit") {
      expect(result.code).toBe(0);
    }
  });

  it("shows no visible effects message for pure dry-run", async () => {
    const task = pure(undefined);
    const result = await runSetupTask(task, { dryRun: true });

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      const text = result.render.plain(result.value);
      expect(text).toContain("no visible effects");
    }
  });
});
