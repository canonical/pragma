import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PackageRef } from "../../refs/operations/parseRef.js";
import createBundledLoader, {
  resetBundledLoaderCache,
} from "./bundledLoader.js";

const ref: PackageRef = { kind: "npm", pkg: "@canonical/design-system" };

/** Minimal stand-in for a Bun embedded-file blob. */
interface FakeBlob {
  readonly name: string;
  text(): Promise<string>;
}

const blob = (name: string, content: string): FakeBlob => ({
  name,
  text: async () => content,
});

const corruptBlob = (name: string): FakeBlob => ({
  name,
  text: async () => {
    throw new Error("embedded blob unreadable");
  },
});

const TTL = "@prefix ds: <https://example.test/ds#> .";

function stubEmbeddedFiles(blobs: readonly FakeBlob[]): void {
  (globalThis as { Bun?: unknown }).Bun = { embeddedFiles: blobs };
}

const hadBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
const originalBun = (globalThis as { Bun?: unknown }).Bun;

let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetBundledLoaderCache();
  stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  resetBundledLoaderCache();
  if (hadBun) {
    (globalThis as { Bun?: unknown }).Bun = originalBun;
  } else {
    delete (globalThis as { Bun?: unknown }).Bun;
  }
  stderrSpy.mockRestore();
});

const stderrText = (): string =>
  stderrSpy.mock.calls.map((call) => String(call[0])).join("");

describe("createBundledLoader", () => {
  it("returns undefined outside a compiled Bun binary", async () => {
    if (!hadBun) {
      delete (globalThis as { Bun?: unknown }).Bun;
      const resolved = await createBundledLoader().resolve(ref);
      expect(resolved).toBeUndefined();
    }
  });

  it("bundles all embedded TTL and reads the manifest version", async () => {
    stubEmbeddedFiles([
      blob("button-a1b2c3d4.ttl", TTL),
      blob("package-a1b2c3d4.json", JSON.stringify({ version: "1.2.3" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved).toBeDefined();
    expect(resolved?.source).toBe("bundled");
    expect(resolved?.version).toBe("1.2.3");
    expect(resolved?.graphs).toEqual([
      {
        path: "(bundled)/button-a1b2c3d4.ttl",
        content: TTL,
        format: "turtle",
      },
    ]);
  });

  it("accepts a plain package.json basename", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("package.json", JSON.stringify({ version: "2.0.0" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);
    expect(resolved?.version).toBe("2.0.0");
  });

  it("warns and skips a corrupt TTL blob instead of silently dropping it", async () => {
    stubEmbeddedFiles([
      blob("good-a1b2c3d4.ttl", TTL),
      corruptBlob("bad-a1b2c3d4.ttl"),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.graphs).toHaveLength(1);
    expect(stderrText()).toContain("bad-a1b2c3d4.ttl");
    expect(stderrText()).toContain("embedded blob unreadable");
  });

  it("serves embedded story JSON as story-file entries", async () => {
    stubEmbeddedFiles([
      blob("button-a1b2c3d4.ttl", TTL),
      blob("package-a1b2c3d4.json", JSON.stringify({ version: "1.2.3" })),
      blob("colors-fyskc7pf.json", JSON.stringify({ noun: "color" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.stories).toEqual([
      {
        path: "(bundled)/colors-fyskc7pf.json",
        definition: { noun: "color" },
      },
    ]);
    expect(resolved?.version).toBe("1.2.3");
  });

  it("does not serve package manifests as stories", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("package.json", JSON.stringify({ version: "2.0.0" })),
      blob("package-deadbeef.json", JSON.stringify({ version: "3.0.0" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.stories).toEqual([]);
  });

  it("warns and skips a story blob with invalid JSON instead of crashing", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("good-a1b2c3d4.json", JSON.stringify({ noun: "color" })),
      blob("broken-a1b2c3d4.json", "{ not json"),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.stories).toHaveLength(1);
    expect(resolved?.stories.at(0)?.definition).toEqual({ noun: "color" });
    expect(stderrText()).toContain("broken-a1b2c3d4.json");
  });

  it("warns and skips an unreadable story blob", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      corruptBlob("story-a1b2c3d4.json"),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.stories).toEqual([]);
    expect(stderrText()).toContain("story-a1b2c3d4.json");
    expect(stderrText()).toContain("embedded blob unreadable");
  });

  it("resolves a stories-only bundle with no TTL graphs", async () => {
    stubEmbeddedFiles([
      blob("colors-fyskc7pf.json", JSON.stringify({ noun: "color" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved).toBeDefined();
    expect(resolved?.graphs).toEqual([]);
    expect(resolved?.stories).toHaveLength(1);
  });

  it("returns undefined when no TTL or story content is embedded", async () => {
    stubEmbeddedFiles([
      blob("template-a1b2c3d4.ejs", "<%= name %>"),
      blob("skill-a1b2c3d4.md", "# Skill"),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved).toBeUndefined();
  });

  it("warns on a corrupt package manifest and falls back to 0.0.0", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("package-deadbeef.json", "{ not json"),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.version).toBe("0.0.0");
    expect(stderrText()).toContain("package-deadbeef.json");
  });

  it("rejects JSON blobs whose basename is not a package manifest", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("mypackage.json", JSON.stringify({ version: "9.9.9" })),
      blob("package-lock.json", JSON.stringify({ version: "8.8.8" })),
      blob("packages.json", JSON.stringify({ version: "7.7.7" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);
    expect(resolved?.version).toBe("0.0.0");
  });

  it("warns on an invalid semver version and keeps looking", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("package-aaaaaaaa.json", JSON.stringify({ version: "not-semver" })),
      blob("package-bbbbbbbb.json", JSON.stringify({ version: "3.4.5" })),
    ]);

    const resolved = await createBundledLoader().resolve(ref);

    expect(resolved?.version).toBe("3.4.5");
    expect(stderrText()).toContain('invalid semver "not-semver"');
  });

  it("caches the resolved package until the cache is reset", async () => {
    stubEmbeddedFiles([
      blob("button.ttl", TTL),
      blob("package.json", JSON.stringify({ version: "1.0.0" })),
    ]);

    const first = await createBundledLoader().resolve(ref);
    expect(first?.version).toBe("1.0.0");

    // New fixture without reset — cached result still returned.
    stubEmbeddedFiles([
      blob("other.ttl", TTL),
      blob("package.json", JSON.stringify({ version: "5.0.0" })),
    ]);
    const second = await createBundledLoader().resolve(ref);
    expect(second).toBe(first);

    // After reset the loader re-reads the embedded files.
    resetBundledLoaderCache();
    const third = await createBundledLoader().resolve(ref);
    expect(third?.version).toBe("5.0.0");
    expect(third).not.toBe(first);
  });
});
