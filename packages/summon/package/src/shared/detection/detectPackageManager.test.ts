import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectPackageManager, { ancestorDirs } from "./detectPackageManager.js";

const withLockfiles = (...present: string[]) =>
  new Map<string, (effect: Effect) => unknown>([
    ["Exists", (e) => present.includes((e as { path: string }).path)],
  ]);

const detect = (cwd: string, ...present: string[]) =>
  dryRunWith(detectPackageManager(cwd), withLockfiles(...present)).value;

describe("ancestorDirs", () => {
  it("lists every directory from start to the filesystem root, nearest first", () => {
    expect(ancestorDirs("/a/b/c")).toEqual(["/a/b/c", "/a/b", "/a", "/"]);
  });

  it("handles the root itself", () => {
    expect(ancestorDirs("/")).toEqual(["/"]);
  });
});

describe("detectPackageManager", () => {
  it("detects each manager from its lockfile in cwd", () => {
    expect(detect("/p", "/p/bun.lockb")).toBe("bun");
    expect(detect("/p", "/p/bun.lock")).toBe("bun");
    expect(detect("/p", "/p/pnpm-lock.yaml")).toBe("pnpm");
    expect(detect("/p", "/p/yarn.lock")).toBe("yarn");
    expect(detect("/p", "/p/package-lock.json")).toBe("npm");
  });

  it("prefers the nearest lockfile over any ancestor's", () => {
    // A local yarn workspace must not be outranked by a bun lockfile higher up.
    expect(detect("/repo/pkg", "/repo/pkg/yarn.lock", "/bun.lockb")).toBe(
      "yarn",
    );
    expect(
      detect("/repo/pkg", "/repo/pkg/pnpm-lock.yaml", "/repo/bun.lockb"),
    ).toBe("pnpm");
  });

  it("finds a lockfile in a distant ancestor", () => {
    expect(detect("/repo/packages/deep/pkg", "/repo/pnpm-lock.yaml")).toBe(
      "pnpm",
    );
    expect(detect("/repo/packages/deep/pkg", "/package-lock.json")).toBe("npm");
  });

  it("prefers bun over the other managers within one directory", () => {
    expect(detect("/p", "/p/bun.lockb", "/p/yarn.lock")).toBe("bun");
    expect(detect("/p", "/p/bun.lock", "/p/pnpm-lock.yaml")).toBe("bun");
  });

  it("prefers pnpm over yarn over npm within one directory", () => {
    expect(
      detect("/p", "/p/pnpm-lock.yaml", "/p/yarn.lock", "/p/package-lock.json"),
    ).toBe("pnpm");
    expect(detect("/p", "/p/yarn.lock", "/p/package-lock.json")).toBe("yarn");
  });

  it("falls back to bun when no lockfile exists anywhere", () => {
    expect(detect("/p")).toBe("bun");
  });
});
