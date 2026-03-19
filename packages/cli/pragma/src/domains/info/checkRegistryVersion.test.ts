import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRegistryVersion,
  DIST_TAG_MAP,
  REGISTRY_TIMEOUT_MS,
} from "./checkRegistryVersion.js";

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

describe("checkRegistryVersion", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns latest version for normal channel", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          "dist-tags": { latest: "0.19.0", experimental: "0.20.0-exp.1" },
        }),
    });

    const result = await checkRegistryVersion("@canonical/pragma", "normal");

    expect(result).toEqual({ latest: "0.19.0", distTag: "latest" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://registry.npmjs.org/@canonical/pragma",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("returns experimental version for experimental channel", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          "dist-tags": { latest: "0.19.0", experimental: "0.20.0-exp.1" },
        }),
    });

    const result = await checkRegistryVersion(
      "@canonical/pragma",
      "experimental",
    );

    expect(result).toEqual({
      latest: "0.20.0-exp.1",
      distTag: "experimental",
    });
  });

  it("returns next version for prerelease channel", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          "dist-tags": { latest: "0.19.0", next: "0.20.0-rc.1" },
        }),
    });

    const result = await checkRegistryVersion(
      "@canonical/pragma",
      "prerelease",
    );

    expect(result).toEqual({ latest: "0.20.0-rc.1", distTag: "next" });
  });

  it("returns undefined when registry responds with non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await checkRegistryVersion("@canonical/pragma", "normal");

    expect(result).toBeUndefined();
  });

  it("returns undefined when dist-tag is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ "dist-tags": { latest: "0.19.0" } }),
    });

    const result = await checkRegistryVersion(
      "@canonical/pragma",
      "prerelease",
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when fetch throws (offline)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await checkRegistryVersion("@canonical/pragma", "normal");

    expect(result).toBeUndefined();
  });

  it("returns undefined when response has no dist-tags", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await checkRegistryVersion("@canonical/pragma", "normal");

    expect(result).toBeUndefined();
  });
});
