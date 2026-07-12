import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BunPlugin } from "bun";
import { afterEach, describe, expect, it } from "vitest";
import createStoryAssetsPlugin, {
  STORY_ASSET_PATH_PATTERN,
} from "./storyAssetsPlugin.js";

interface OnLoadRegistration {
  readonly filter: RegExp;
  readonly callback: (args: { path: string }) => unknown;
}

/** Run the plugin's setup against a stub builder and capture its onLoad. */
function captureOnLoadRegistration(): OnLoadRegistration {
  let captured: OnLoadRegistration | undefined;
  const builder = {
    onLoad(
      constraints: { filter: RegExp },
      callback: OnLoadRegistration["callback"],
    ): void {
      captured = { filter: constraints.filter, callback };
    },
  };

  createStoryAssetsPlugin().setup(
    builder as unknown as Parameters<BunPlugin["setup"]>[0],
  );

  if (!captured) throw new Error("plugin did not register an onLoad handler");
  return captured;
}

describe("STORY_ASSET_PATH_PATTERN", () => {
  it("matches JSON directly inside a stories directory", () => {
    expect(
      STORY_ASSET_PATH_PATTERN.test(
        "/repo/node_modules/@canonical/design-system/stories/color.json",
      ),
    ).toBe(true);
  });

  it("rejects manifests, nested files, near-miss directories, and non-JSON", () => {
    const nonStories = [
      "/repo/node_modules/@canonical/design-system/package.json",
      "/repo/node_modules/@canonical/design-system/stories/nested/color.json",
      "/repo/node_modules/@canonical/design-system/histories/color.json",
      "/repo/node_modules/@canonical/design-system/stories/color.jsonc",
      "/repo/node_modules/@canonical/design-system/stories/color.ttl",
    ];
    for (const path of nonStories) {
      expect(STORY_ASSET_PATH_PATTERN.test(path), path).toBe(false);
    }
  });
});

describe("createStoryAssetsPlugin", () => {
  let tmpDir: string | undefined;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it("registers its load hook under the story path filter", () => {
    const { filter } = captureOnLoadRegistration();
    expect(filter).toBe(STORY_ASSET_PATH_PATTERN);
  });

  it("loads story JSON contents under the file loader", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "pragma-story-assets-"));
    const storyPath = join(tmpDir, "color.json");
    const content = JSON.stringify({ noun: "color" });
    writeFileSync(storyPath, content);

    const { callback } = captureOnLoadRegistration();

    expect(callback({ path: storyPath })).toEqual({
      contents: content,
      loader: "file",
    });
  });
});
