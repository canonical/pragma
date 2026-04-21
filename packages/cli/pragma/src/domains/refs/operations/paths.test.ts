import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheRoot, gitCacheDir, globalConfigDir } from "./paths.js";

describe("cacheRoot", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("uses PRAGMA_CACHE_DIR when set", () => {
    process.env.PRAGMA_CACHE_DIR = "/tmp/pragma-test-cache";
    expect(cacheRoot()).toBe("/tmp/pragma-test-cache");
  });

  it("uses XDG_CACHE_HOME/pragma when set", () => {
    delete process.env.PRAGMA_CACHE_DIR;
    process.env.XDG_CACHE_HOME = "/tmp/xdg-cache";
    expect(cacheRoot()).toBe(join("/tmp/xdg-cache", "pragma"));
  });

  it("PRAGMA_CACHE_DIR takes precedence over XDG_CACHE_HOME", () => {
    process.env.PRAGMA_CACHE_DIR = "/tmp/pragma-override";
    process.env.XDG_CACHE_HOME = "/tmp/xdg-cache";
    expect(cacheRoot()).toBe("/tmp/pragma-override");
  });

  it("falls back to ~/.cache/pragma", () => {
    delete process.env.PRAGMA_CACHE_DIR;
    delete process.env.XDG_CACHE_HOME;
    expect(cacheRoot()).toBe(join(homedir(), ".cache", "pragma"));
  });
});

describe("globalConfigDir", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("uses XDG_CONFIG_HOME/pragma when set", () => {
    process.env.XDG_CONFIG_HOME = "/tmp/xdg-config";
    expect(globalConfigDir()).toBe(join("/tmp/xdg-config", "pragma"));
  });

  it("falls back to ~/.config/pragma", () => {
    delete process.env.XDG_CONFIG_HOME;
    expect(globalConfigDir()).toBe(join(homedir(), ".config", "pragma"));
  });
});

describe("gitCacheDir", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.PRAGMA_CACHE_DIR = "/tmp/pragma-test-cache";
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns cache path for a package and ref", () => {
    expect(gitCacheDir("@canonical/design-system", "main")).toBe(
      join("/tmp/pragma-test-cache", "refs", "@canonical/design-system", "main"),
    );
  });

  it("sanitizes slashes in ref", () => {
    expect(gitCacheDir("@canonical/design-system", "feature/branch")).toBe(
      join(
        "/tmp/pragma-test-cache",
        "refs",
        "@canonical/design-system",
        "feature_branch",
      ),
    );
  });

  it("sanitizes colons in ref", () => {
    expect(gitCacheDir("@canonical/design-system", "v1:beta")).toBe(
      join(
        "/tmp/pragma-test-cache",
        "refs",
        "@canonical/design-system",
        "v1_beta",
      ),
    );
  });
});
