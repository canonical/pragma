import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import checkRegistryVersion from "./checkRegistryVersion.js";

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

    const result = await checkRegistryVersion(
      "@canonical/pragma-cli",
      "normal",
    );

    expect(result).toEqual({ latest: "0.19.0", distTag: "latest" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://registry.npmjs.org/%40canonical%2Fpragma-cli",
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
      "@canonical/pragma-cli",
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
      "@canonical/pragma-cli",
      "prerelease",
    );

    expect(result).toEqual({ latest: "0.20.0-rc.1", distTag: "next" });
  });

  it("returns undefined when registry responds with non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await checkRegistryVersion(
      "@canonical/pragma-cli",
      "normal",
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when dist-tag is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ "dist-tags": { latest: "0.19.0" } }),
    });

    const result = await checkRegistryVersion(
      "@canonical/pragma-cli",
      "prerelease",
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when fetch throws (offline)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await checkRegistryVersion(
      "@canonical/pragma-cli",
      "normal",
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when response has no dist-tags", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await checkRegistryVersion(
      "@canonical/pragma-cli",
      "normal",
    );

    expect(result).toBeUndefined();
  });
});
