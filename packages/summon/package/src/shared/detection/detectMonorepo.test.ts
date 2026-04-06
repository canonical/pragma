import * as path from "node:path";
import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectMonorepo from "./detectMonorepo.js";

const lernaJson = JSON.stringify({ version: "0.22.0" });

const buildMocks = (
  existsPredicate: (path: string) => boolean,
  readContent = lernaJson,
) =>
  new Map<string, (effect: Effect) => unknown>([
    ["Exists", (e) => existsPredicate((e as { path: string }).path)],
    ["ReadFile", () => readContent],
  ]);

describe("detectMonorepo", () => {
  it("detects lerna.json in cwd", () => {
    const cwd = "/a/b/c";
    const lernaPath = path.join(cwd, "lerna.json");

    const result = dryRunWith(
      detectMonorepo(cwd),
      buildMocks((p) => p === lernaPath),
    );

    expect(result.value).toEqual({ isMonorepo: true, version: "0.22.0" });
  });

  it("detects lerna.json in parent directory", () => {
    const cwd = "/a/b/c";
    const parentLernaPath = path.join(cwd, "..", "lerna.json");

    const result = dryRunWith(
      detectMonorepo(cwd),
      buildMocks((p) => p === parentLernaPath),
    );

    expect(result.value).toEqual({ isMonorepo: true, version: "0.22.0" });
  });

  it("detects lerna.json in grandparent directory", () => {
    const cwd = "/a/b/c";
    const grandparentLernaPath = path.join(cwd, "..", "..", "lerna.json");

    const result = dryRunWith(
      detectMonorepo(cwd),
      buildMocks((p) => p === grandparentLernaPath),
    );

    expect(result.value).toEqual({ isMonorepo: true, version: "0.22.0" });
  });

  it("returns not monorepo when no lerna.json found", () => {
    const result = dryRunWith(
      detectMonorepo("/standalone"),
      buildMocks(() => false),
    );

    expect(result.value).toEqual({ isMonorepo: false });
  });
});
