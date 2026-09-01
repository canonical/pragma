/**
 * Covers the two things `checkNodeVersion` owns beyond the range comparison:
 * the shape of the CheckResult, and that the failure path quotes the declared
 * range rather than a number of its own. The range logic itself is pinned in
 * `isSupportedNodeVersion.test.ts`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_NODE_RANGE } from "../../../constants.js";
import { checkNodeVersion } from "./checkNodeVersion.js";

/** Swap `process.versions.node`, which is read-only in the normal way. */
function withNodeVersion(version: string) {
  vi.spyOn(process, "versions", "get").mockReturnValue({
    ...process.versions,
    node: version,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkNodeVersion — reports against the declared range", () => {
  it("passes on a supported version and reports it", async () => {
    withNodeVersion("24.18.1");
    const result = await checkNodeVersion();
    expect(result).toEqual({
      name: "Node version",
      status: "pass",
      detail: "v24.18.1",
    });
  });

  it("fails on an unsupported version and quotes the declared range", async () => {
    withNodeVersion("20.19.0");
    const result = await checkNodeVersion();
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("v20.19.0");
    // The range must come from the manifest, never from a literal in the check.
    expect(result.detail).toContain(SUPPORTED_NODE_RANGE);
    expect(result.remedy).toContain(SUPPORTED_NODE_RANGE);
  });

  it("fails inside the 23.0-23.5 window the range excludes", async () => {
    withNodeVersion("23.2.0");
    expect((await checkNodeVersion()).status).toBe("fail");
  });
});
