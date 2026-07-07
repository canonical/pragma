/**
 * Copy generator template trees into a build's `dist/esm` output.
 *
 * The summon generator packages compile their generator LOGIC (`.ts`/`.tsx`)
 * with `tsc`, but their `templates/` directories are DATA read from disk at
 * runtime (`fs.readFile` / ejs), never imported. Those dirs hold a mix of
 * `.ejs` files AND raw `.ts`/`.tsx`/`.css`/dotfiles that are scaffolded verbatim
 * into generated projects — so they must NOT be compiled. tsc is configured to
 * exclude `templates/`; this script copies each template tree byte-for-byte into
 * the mirrored `dist/esm` location so `__dirname/templates` resolves after build.
 *
 * Usage: bun scripts/copy-templates.ts <srcDir> <distDir>
 *   e.g. bun scripts/copy-templates.ts src dist/esm
 *
 * Copies every file under any directory named `templates` inside <srcDir>,
 * preserving the path relative to <srcDir>, into <distDir>.
 *
 * @note Impure — reads and writes the filesystem.
 */

import { Glob } from "bun";
import { mkdir } from "node:fs/promises";
import * as path from "node:path";

const [, , srcDir = "src", distDir = "dist/esm"] = process.argv;

// Match every file that lives under a `templates/` segment at any depth.
const glob = new Glob("**/templates/**/*");

let copied = 0;
for (const rel of glob.scanSync({
  cwd: srcDir,
  onlyFiles: true,
  dot: true, // include dotfiles like .gitkeep
})) {
  const from = path.join(srcDir, rel);
  const to = path.join(distDir, rel);
  await mkdir(path.dirname(to), { recursive: true });
  await Bun.write(to, Bun.file(from));
  copied++;
}

console.log(`Copied ${copied} template file(s) from ${srcDir} to ${distDir}`);
