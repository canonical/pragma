import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";

/** Matches the default hash length bundlers (Vite, webpack) use for their
 * own emitted assets — short enough to keep filenames readable, long enough
 * that collisions are not a practical concern for a directory this size. */
const DEFAULT_HASH_LENGTH = 8;

export interface BuildAssetManifestOptions {
  /** Directory whose files (top-level only) should be hashed. */
  sourceDir: string;
  /** Directory to write hashed copies into; created if missing. */
  outDir: string;
  /** Hash length in hex characters. */
  hashLength?: number;
}

/**
 * Hashes the contents of every file directly inside `sourceDir`, copies each
 * to `outDir` under a content-hashed filename (`<name>.<hash><ext>`), and
 * returns a mapping from each file's basename (without extension) to its
 * hashed filename.
 *
 * This is the same content-addressing `ds-assets` uses to build its own
 * `ICON_MANIFEST` (see `scripts/build-icon-manifest.ts` and
 * docs/ICONS.md#self-hosting-and-cache-invalidation), factored out so
 * consumers can apply it to their own custom icons — or any other small
 * static files — and get identical cache-invalidation guarantees. Merge the
 * result into `Icon`'s `manifest` prop alongside `ICON_MANIFEST`:
 *
 * ```ts
 * import { buildAssetManifest } from "@canonical/ds-assets/build";
 *
 * const customManifest = buildAssetManifest({
 *   sourceDir: "./src/custom-icons",
 *   outDir: "./public/icons",
 * });
 * // <Icon manifest={{ ...ICON_MANIFEST, ...customManifest }} ... />
 * ```
 *
 * @note Impure — reads `sourceDir` and writes into `outDir`.
 */
export function buildAssetManifest({
  sourceDir,
  outDir,
  hashLength = DEFAULT_HASH_LENGTH,
}: BuildAssetManifestOptions): Record<string, string> {
  mkdirSync(outDir, { recursive: true });

  const manifest: Record<string, string> = {};

  const entries = readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip subdirectories and dotfiles (e.g. `.DS_Store`) — sourceDir is
    // expected to be a flat directory of asset files, matching ds-assets'
    // own `icons/` layout.
    if (!entry.isFile() || entry.name.startsWith(".")) continue;

    const { name, ext } = parse(entry.name);
    const contents = readFileSync(join(sourceDir, entry.name));
    const hash = createHash("sha256")
      .update(contents)
      .digest("hex")
      .slice(0, hashLength);
    const hashedFileName = `${name}.${hash}${ext}`;

    writeFileSync(join(outDir, hashedFileName), contents);
    manifest[name] = hashedFileName;
  }

  return manifest;
}
