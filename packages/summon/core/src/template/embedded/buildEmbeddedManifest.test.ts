import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import buildEmbeddedManifest from "./buildEmbeddedManifest.js";
import qualifiedKey from "./keyScheme.js";

function write(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe("buildEmbeddedManifest", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "core-manifest-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("walks every file — not just .ejs, dotfiles included — keyed by qualifiedKey", () => {
    const root = join(dir, "templates");
    write(join(root, "react", "types.ts.ejs"), "TYPES");
    write(join(root, "shared", "styles.css.ejs"), "STYLES");
    write(join(root, "raw", "robots.txt"), "ROBOTS");
    write(join(root, "raw", ".gitkeep"), "");

    const manifest = buildEmbeddedManifest([
      { prefix: "component", dir: root },
    ]);
    expect(manifest).toEqual({
      "component/raw/.gitkeep": "",
      "component/raw/robots.txt": "ROBOTS",
      "component/react/types.ts.ejs": "TYPES",
      "component/shared/styles.css.ejs": "STYLES",
    });
    // Deterministic: keys come out sorted.
    expect(Object.keys(manifest)).toEqual([...Object.keys(manifest)].sort());
  });

  it("emits keys the READER derives — the one scheme, round-tripped", () => {
    const root = join(dir, "app", "templates");
    write(join(root, "src", "lib", "index.ts.ejs"), "LIB");
    const manifest = buildEmbeddedManifest([
      { prefix: "application/react", dir: root },
    ]);
    // The reader's key for the same file's source path is the writer's key.
    const readerKey = qualifiedKey(
      "application/react",
      join(root, "src", "lib", "index.ts.ejs"),
    );
    expect(readerKey).toBe("application/react/src/lib/index.ts.ejs");
    expect(manifest[readerKey as string]).toBe("LIB");
  });

  it("a nested templates/ dir keys by the LAST segment — unified with the reader", () => {
    // A scaffolded app that itself ships templates: the file lives under a
    // SECOND templates/ dir. The reader slices after the LAST segment, so the
    // writer must too — a relative()-derived key here would be unreachable.
    const root = join(dir, "templates");
    const nested = join(root, "nested", "templates", "file.ejs");
    write(nested, "NESTED");
    const manifest = buildEmbeddedManifest([{ prefix: "x", dir: root }]);
    expect(manifest).toEqual({ "x/file.ejs": "NESTED" });
    expect(qualifiedKey("x", nested)).toBe("x/file.ejs");
  });

  it("throws on a key collision instead of silently shadowing an entry", () => {
    const root = join(dir, "templates");
    write(join(root, "file.ejs"), "OUTER");
    write(join(root, "nested", "templates", "file.ejs"), "INNER");
    expect(() => buildEmbeddedManifest([{ prefix: "x", dir: root }])).toThrow(
      /key collision: .*file\.ejs derives "x\/file\.ejs"/,
    );
  });

  it("throws on a file the reader could never key (no templates/ segment)", () => {
    const root = join(dir, "assets");
    write(join(root, "stray.ejs"), "STRAY");
    expect(() =>
      buildEmbeddedManifest([{ prefix: "component", dir: root }]),
    ).toThrow(/stray\.ejs has no "templates\/" segment/);
  });

  it("merges several roots into one manifest", () => {
    const componentRoot = join(dir, "c", "templates");
    const packageRoot = join(dir, "p", "templates");
    write(join(componentRoot, "react", "x.ejs"), "X");
    write(join(packageRoot, "tsconfig.json.ejs"), "T");
    const manifest = buildEmbeddedManifest([
      { prefix: "component", dir: componentRoot },
      { prefix: "package", dir: packageRoot },
    ]);
    expect(Object.keys(manifest)).toEqual([
      "component/react/x.ejs",
      "package/tsconfig.json.ejs",
    ]);
  });

  it("throws PER ROOT on zero files, naming the prefix and dir", () => {
    const empty = join(dir, "empty");
    mkdirSync(empty, { recursive: true });
    expect(() =>
      buildEmbeddedManifest([{ prefix: "package", dir: empty }]),
    ).toThrow(/No template files under .* for prefix "package"/);
  });

  it("throws on a file that does not survive a UTF-8 round trip", () => {
    const root = join(dir, "templates");
    // 0xC0 is an invalid UTF-8 byte: decoding replaces it, re-encoding differs.
    write(join(root, "binary.png"), Buffer.from([0xc0, 0x00, 0x01]));
    expect(() =>
      buildEmbeddedManifest([{ prefix: "component", dir: root }]),
    ).toThrow(/binary\.png is not valid UTF-8 text/);
  });
});
