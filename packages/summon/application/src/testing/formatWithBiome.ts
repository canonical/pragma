import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const biome = require.resolve("@biomejs/biome/bin/biome");
/** The repository's shared Biome configuration, which scaffolded apps extend. */
const sharedConfig = require.resolve("@canonical/biome-config");

/** What one Biome run made of a batch of files. */
export interface BiomeBatch {
  /** Biome's report when some file did not parse, otherwise `null`. */
  readonly failures: string | null;
  /** Each file as Biome formats it (its input, when it did not parse). */
  readonly formatted: Readonly<Record<string, string>>;
}

/**
 * Parse and format a batch of files in ONE Biome process, the test suite's
 * one parse oracle for emitted source.
 *
 * The files are written to a throwaway directory and formatted there in
 * place: Biome formats every file it can parse and exits non-zero only when
 * one does not, so the exit status is exactly the parse verdict. No module
 * resolution is involved. The directory's configuration only extends the
 * repository's shared one, which scaffolded apps extend too, so "formatted"
 * means what it means in such an app.
 *
 * @param files - Relative path → source text.
 * @returns The parse verdict and each file as formatted.
 */
export function formatWithBiome(
  files: Readonly<Record<string, string>>,
): BiomeBatch {
  const root = mkdtempSync(path.join(tmpdir(), "summon-biome-"));
  try {
    writeFileSync(
      path.join(root, "biome.json"),
      JSON.stringify({ extends: [sharedConfig] }),
    );
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), content);
    }
    const result = spawnSync(
      process.execPath,
      [biome, "format", "--write", "."],
      { cwd: root, encoding: "utf8" },
    );
    const formatted = Object.fromEntries(
      Object.keys(files).map((file) => [
        file,
        readFileSync(path.join(root, file), "utf8"),
      ]),
    );
    return {
      failures: result.status === 0 ? null : result.stdout + result.stderr,
      formatted,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
