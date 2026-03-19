import { describe, expect, it } from "vitest";
import { DIST_TAG_MAP, REGISTRY_TIMEOUT_MS } from "./constants.js";

describe("DIST_TAG_MAP", () => {
  it("maps normal to latest", () => {
    expect(DIST_TAG_MAP.normal).toBe("latest");
  });

  it("maps experimental to experimental", () => {
    expect(DIST_TAG_MAP.experimental).toBe("experimental");
  });

  it("maps prerelease to next", () => {
    expect(DIST_TAG_MAP.prerelease).toBe("next");
  });
});

describe("REGISTRY_TIMEOUT_MS", () => {
  it("is 3 seconds", () => {
    expect(REGISTRY_TIMEOUT_MS).toBe(3_000);
  });
});
