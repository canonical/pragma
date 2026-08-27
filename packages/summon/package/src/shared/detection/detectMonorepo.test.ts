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

  it("detects lerna.json in a distant ancestor (deeper than two levels)", () => {
    const result = dryRunWith(
      detectMonorepo("/repo/packages/summon/package"),
      buildMocks((p) => p === "/repo/lerna.json"),
    );

    expect(result.value).toEqual({ isMonorepo: true, version: "0.22.0" });
  });

  it("degrades a malformed lerna.json to not-monorepo instead of crashing", () => {
    const result = dryRunWith(
      detectMonorepo("/a/b/c"),
      buildMocks((p) => p === "/a/b/c/lerna.json", "{not json"),
    );

    expect(result.value).toEqual({ isMonorepo: false });
  });

  it("detects a pnpm workspace root and reads its manifest version", () => {
    const mocks = new Map<string, (effect: Effect) => unknown>([
      [
        "Exists",
        (e) => {
          const p = (e as { path: string }).path;
          return (
            p === "/repo/pnpm-workspace.yaml" || p === "/repo/package.json"
          );
        },
      ],
      ["ReadFile", () => JSON.stringify({ version: "2.0.0" })],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/packages/x"), mocks);

    expect(result.value).toEqual({ isMonorepo: true, version: "2.0.0" });
  });

  it("detects a package.json workspaces root", () => {
    const mocks = new Map<string, (effect: Effect) => unknown>([
      ["Exists", (e) => (e as { path: string }).path === "/repo/package.json"],
      [
        "ReadFile",
        () => JSON.stringify({ version: "3.1.0", workspaces: ["packages/*"] }),
      ],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/apps"), mocks);

    expect(result.value).toEqual({ isMonorepo: true, version: "3.1.0" });
  });

  it("skips a plain package.json without workspaces and keeps walking up", () => {
    const mocks = new Map<string, (effect: Effect) => unknown>([
      [
        "Exists",
        (e) => {
          const p = (e as { path: string }).path;
          return p === "/repo/app/package.json" || p === "/repo/lerna.json";
        },
      ],
      [
        "ReadFile",
        (e) =>
          (e as { path: string }).path === "/repo/lerna.json"
            ? lernaJson
            : JSON.stringify({ name: "app" }),
      ],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/app"), mocks);

    expect(result.value).toEqual({ isMonorepo: true, version: "0.22.0" });
  });

  it("detects a pnpm workspace root that has no adjacent package.json", () => {
    const mocks = new Map<string, (effect: Effect) => unknown>([
      [
        "Exists",
        (e) => (e as { path: string }).path === "/repo/pnpm-workspace.yaml",
      ],
      ["ReadFile", () => ""],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/packages/x"), mocks);

    expect(result.value).toEqual({ isMonorepo: true });
  });

  it("detects a pnpm workspace root with a malformed manifest, sans version", () => {
    const mocks = new Map<string, (effect: Effect) => unknown>([
      [
        "Exists",
        (e) => {
          const p = (e as { path: string }).path;
          return (
            p === "/repo/pnpm-workspace.yaml" || p === "/repo/package.json"
          );
        },
      ],
      ["ReadFile", () => "{ not json"],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/packages/x"), mocks);

    expect(result.value).toEqual({ isMonorepo: true, version: undefined });
  });

  it("reports no version when the marker's version field is not a string", () => {
    const result = dryRunWith(
      detectMonorepo("/a/b"),
      buildMocks(
        (p) => p === "/a/b/lerna.json",
        JSON.stringify({ version: 22 }),
      ),
    );

    expect(result.value).toEqual({ isMonorepo: true, version: undefined });
  });

  it("treats a manifest holding valid non-object JSON as no data", () => {
    // safeParse: JSON.parse succeeds ("42" is valid JSON) but yields no
    // object — the walk must fall through, not crash or false-positive.
    const mocks = new Map<string, (effect: Effect) => unknown>([
      [
        "Exists",
        (e) => (e as { path: string }).path === "/repo/app/package.json",
      ],
      ["ReadFile", () => "42"],
    ]);

    const result = dryRunWith(detectMonorepo("/repo/app"), mocks);

    expect(result.value).toEqual({ isMonorepo: false });
  });
});
