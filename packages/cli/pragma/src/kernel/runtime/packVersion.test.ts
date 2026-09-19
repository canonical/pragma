/**
 * The builder-version comparison behind the boot decision's upgrade row.
 *
 * It decides whether a pack a user built on purpose is passed over, so the
 * cases that matter most here are the ones where it must answer NO.
 */

import { describe, expect, it } from "vitest";
import { packIsOlderThanCli, parseSemver } from "./packVersion.js";

describe("parseSemver", () => {
  it("parses a release triple", () => {
    expect(parseSemver("0.38.0")).toEqual([0, 38, 0]);
    expect(parseSemver("10.2.137")).toEqual([10, 2, 137]);
  });

  it("parses a pre-release/build version to its release triple", () => {
    // The suffix orders two builds of the same release; this comparison only
    // ever asks which RELEASE is older.
    expect(parseSemver("1.2.3-rc.1")).toEqual([1, 2, 3]);
    expect(parseSemver("1.2.3+sha.abc")).toEqual([1, 2, 3]);
  });

  it("refuses anything that is not a version", () => {
    for (const value of ["0", "1.2", "v1.2.3", "", "next", "1.2.3.4"]) {
      expect(parseSemver(value)).toBeUndefined();
    }
  });
});

describe("packIsOlderThanCli", () => {
  it("is true only for a pack built by a strictly older CLI", () => {
    expect(packIsOlderThanCli("0.37.0", "0.38.0")).toBe(true);
    expect(packIsOlderThanCli("0.38.0", "1.0.0")).toBe(true);
    expect(packIsOlderThanCli("1.2.3", "1.2.4")).toBe(true);
  });

  it("keeps the pack when the versions are equal", () => {
    expect(packIsOlderThanCli("0.38.0", "0.38.0")).toBe(false);
  });

  it("keeps the pack when a NEWER CLI built it", () => {
    // A downgrade, or two CLIs sharing one cache. The user's own build wins.
    expect(packIsOlderThanCli("0.39.0", "0.38.0")).toBe(false);
    expect(packIsOlderThanCli("1.0.0", "0.38.0")).toBe(false);
  });

  it("keeps the pack under a dev build (0.0.0) or an unreadable CLI version", () => {
    // A local checkout must not start reporting every pack on the machine as
    // stale — its version says nothing about how its snapshot compares.
    expect(packIsOlderThanCli("0.37.0", "0.0.0")).toBe(false);
    expect(packIsOlderThanCli("0.37.0", "workspace")).toBe(false);
  });

  it("keeps a pack whose recorded version cannot be read", () => {
    // The notice names the version that built the pack, so a pack we cannot
    // name is one we cannot honestly call old.
    expect(packIsOlderThanCli("0", "0.38.0")).toBe(false);
    expect(packIsOlderThanCli("", "0.38.0")).toBe(false);
  });
});
