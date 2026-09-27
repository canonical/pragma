/**
 * The interactive preview reads the real disk: a generator that refuses unless
 * a file it adds to already exists previews its plan when that file is there,
 * instead of failing the preview as if the disk were empty.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { exists, fail, ifElseM, writeFile } from "@canonical/task";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App.js";

const addsTo: GeneratorDefinition = {
  meta: {
    name: "fixture/adds-to",
    displayName: "adds-to",
    description: "Adds a file next to one that must already exist",
    version: "0.0.1",
  },
  prompts: [{ name: "title", type: "text", message: "Title:", default: "t" }],
  generate: () =>
    ifElseM(
      exists("base.txt"),
      writeFile("added.txt", "added\n"),
      fail({ code: "BASE_MISSING", message: "base.txt is missing" }),
    ),
};

const tick = (ms = 15) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until a frame satisfies `check` (the preview settles asynchronously). */
const waitForFrame = async (
  read: () => string | undefined,
  check: (frame: string) => boolean,
  timeout = 15_000,
): Promise<string> => {
  const deadline = Date.now() + timeout;
  let frame = read() ?? "";
  while (!check(frame) && Date.now() < deadline) {
    await tick();
    frame = read() ?? "";
  }
  return frame;
};

describe("App — the interactive preview reads the real disk", () => {
  const previous = process.cwd();
  beforeEach(() => {
    process.chdir(mkdtempSync(join(tmpdir(), "summon-preview-")));
  });
  afterEach(() => {
    process.chdir(previous);
    process.exitCode = undefined;
  });

  it("previews the plan when the file the generator adds to exists", async () => {
    writeFileSync("base.txt", "base\n");
    const { lastFrame, unmount } = render(
      <App generator={addsTo} askMissing answers={{ title: "x" }} />,
    );
    const frame = await waitForFrame(
      lastFrame,
      (f) => f.includes("Proceed?") || f.includes("base.txt is missing"),
    );
    expect(frame).toContain("Proceed?");
    expect(frame).not.toContain("base.txt is missing");
    unmount();
  });

  it("fails the preview with the generator's own message when it is missing", async () => {
    const { lastFrame, unmount } = render(
      <App generator={addsTo} askMissing answers={{ title: "x" }} />,
    );
    const frame = await waitForFrame(
      lastFrame,
      (f) => f.includes("Proceed?") || f.includes("base.txt is missing"),
    );
    expect(frame).toContain("base.txt is missing");
    unmount();
  });
});
