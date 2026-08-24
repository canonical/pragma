import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAssetManifest } from "./buildAssetManifest.js";

const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function makeSourceDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "build-asset-manifest-"));
  roots.push(root);
  for (const [fileName, contents] of Object.entries(files)) {
    writeFileSync(join(root, fileName), contents);
  }
  return root;
}

function hashOf(contents: string, length = 8): string {
  return createHash("sha256").update(contents).digest("hex").slice(0, length);
}

describe("buildAssetManifest", () => {
  it("hashes each file's contents into its distributed filename", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>a</svg>" });
    const outDir = join(sourceDir, "out");

    const manifest = buildAssetManifest({ sourceDir, outDir });

    expect(manifest).toEqual({
      "my-icon": `my-icon.${hashOf("<svg>a</svg>")}.svg`,
    });
  });

  it("writes a hashed copy with identical contents to outDir", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>b</svg>" });
    const outDir = join(sourceDir, "out");

    const manifest = buildAssetManifest({ sourceDir, outDir });

    const written = readFileSync(join(outDir, manifest["my-icon"]), "utf-8");
    expect(written).toBe("<svg>b</svg>");
  });

  it("gives two files with identical contents the same hash", () => {
    const sourceDir = makeSourceDir({
      "a.svg": "<svg>same</svg>",
      "b.svg": "<svg>same</svg>",
    });

    const manifest = buildAssetManifest({
      sourceDir,
      outDir: join(sourceDir, "out"),
    });

    const hashA = manifest.a.split(".")[1];
    const hashB = manifest.b.split(".")[1];
    expect(hashA).toBe(hashB);
  });

  it("changes the hash when a file's contents change", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>v1</svg>" });
    const outDir = join(sourceDir, "out");

    const before = buildAssetManifest({ sourceDir, outDir });
    writeFileSync(join(sourceDir, "my-icon.svg"), "<svg>v2</svg>");
    const after = buildAssetManifest({ sourceDir, outDir });

    expect(after["my-icon"]).not.toBe(before["my-icon"]);
  });

  it("respects a custom hashLength", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>c</svg>" });

    const manifest = buildAssetManifest({
      sourceDir,
      outDir: join(sourceDir, "out"),
      hashLength: 12,
    });

    expect(manifest["my-icon"]).toBe(
      `my-icon.${hashOf("<svg>c</svg>", 12)}.svg`,
    );
  });

  it("skips subdirectories and dotfiles", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>d</svg>" });
    mkdirSync(join(sourceDir, "nested"));
    writeFileSync(
      join(sourceDir, "nested", "ignored.svg"),
      "<svg>ignored</svg>",
    );
    writeFileSync(join(sourceDir, ".DS_Store"), "not an asset");

    const manifest = buildAssetManifest({
      sourceDir,
      outDir: join(sourceDir, "out"),
    });

    expect(Object.keys(manifest)).toEqual(["my-icon"]);
  });

  it("creates outDir if it doesn't already exist", () => {
    const sourceDir = makeSourceDir({ "my-icon.svg": "<svg>e</svg>" });
    const outDir = join(sourceDir, "nested", "out");
    expect(existsSync(outDir)).toBe(false);

    buildAssetManifest({ sourceDir, outDir });

    expect(readdirSync(outDir)).toHaveLength(1);
  });
});
