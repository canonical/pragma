import * as path from "node:path";
import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectPackageManager from "./detectPackageManager.js";

// All paths are built with node:path from the platform's real root, so the
// expectations track the same path semantics the production walk uses.
const ROOT = path.parse(path.resolve("/")).root;
const at = (...segments: string[]) => path.join(ROOT, ...segments);

const withLockfiles = (...present: string[]) =>
  new Map<string, (effect: Effect) => unknown>([
    ["Exists", (e) => present.includes((e as { path: string }).path)],
  ]);

const detect = (cwd: string, ...present: string[]) =>
  dryRunWith(detectPackageManager(cwd), withLockfiles(...present)).value;

describe("detectPackageManager", () => {
  it("detects each manager from its lockfile in cwd", () => {
    expect(detect(at("p"), at("p", "bun.lockb"))).toBe("bun");
    expect(detect(at("p"), at("p", "bun.lock"))).toBe("bun");
    expect(detect(at("p"), at("p", "pnpm-lock.yaml"))).toBe("pnpm");
    expect(detect(at("p"), at("p", "yarn.lock"))).toBe("yarn");
    expect(detect(at("p"), at("p", "package-lock.json"))).toBe("npm");
  });

  it("prefers the nearest lockfile over any ancestor's", () => {
    // A local yarn workspace must not be outranked by a bun lockfile higher up.
    expect(
      detect(
        at("repo", "pkg"),
        at("repo", "pkg", "yarn.lock"),
        at("bun.lockb"),
      ),
    ).toBe("yarn");
    expect(
      detect(
        at("repo", "pkg"),
        at("repo", "pkg", "pnpm-lock.yaml"),
        at("repo", "bun.lockb"),
      ),
    ).toBe("pnpm");
  });

  it("finds a lockfile in a distant ancestor", () => {
    expect(
      detect(
        at("repo", "packages", "deep", "pkg"),
        at("repo", "pnpm-lock.yaml"),
      ),
    ).toBe("pnpm");
    expect(
      detect(at("repo", "packages", "deep", "pkg"), at("package-lock.json")),
    ).toBe("npm");
  });

  it("prefers bun over the other managers within one directory", () => {
    expect(detect(at("p"), at("p", "bun.lockb"), at("p", "yarn.lock"))).toBe(
      "bun",
    );
    expect(
      detect(at("p"), at("p", "bun.lock"), at("p", "pnpm-lock.yaml")),
    ).toBe("bun");
  });

  it("prefers pnpm over yarn over npm within one directory", () => {
    expect(
      detect(
        at("p"),
        at("p", "pnpm-lock.yaml"),
        at("p", "yarn.lock"),
        at("p", "package-lock.json"),
      ),
    ).toBe("pnpm");
    expect(
      detect(at("p"), at("p", "yarn.lock"), at("p", "package-lock.json")),
    ).toBe("yarn");
  });

  it("falls back to bun when no lockfile exists anywhere", () => {
    expect(detect(at("p"))).toBe("bun");
  });
});
