/**
 * PROTECTED — the cross-binary subprocess guard (one representative generator):
 * the real `pragma2` bin's `create component … --yes` vs an independently
 * launched summon-core `execute` process (the summon bin's exact core path).
 * A byte-for-byte match across two SEPARATE processes catches bin-level stamp /
 * version / path divergence that an in-process test could mask.
 *
 * NOTE: the summon side runs summon-core `execute` directly rather than the
 * summon bin — this repo's summon bin ships only its `init`/`example` builtins,
 * not the canonical component generators — but it is the identical core the bin
 * uses, in its own process.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
const pragmaBin = join(repoRoot, "packages/cli/next/src/bin.ts");
const summonCore = join(repoRoot, "packages/summon/core/dist/esm/index.js");
const pickGen = join(here, "pickGenerator.ts");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma2-xbin-"));

function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string, base: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(d, entry.name), rel);
      else out.set(rel, readFileSync(join(d, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return out;
}

describe("cross-binary byte-equality (PROTECTED)", () => {
  it("pragma2 bin create ≡ summon-core execute across two processes", () => {
    // (1) The real pragma2 bin, run in its own process.
    const pragmaDir = freshCwd();
    execFileSync(
      "bun",
      [
        pragmaBin,
        "create",
        "component",
        "src/components/Button",
        "--framework",
        "react",
        "--yes",
      ],
      { cwd: pragmaDir, stdio: "pipe" },
    );

    // (2) A separate summon-core execute process (the summon bin's core path).
    const summonDir = freshCwd();
    const script = join(freshCwd(), "produce.mjs");
    writeFileSync(
      script,
      `
import { pickGenerator } from ${JSON.stringify(`file://${pickGen}`)};
import { execute, autoPrompt, runGeneratorTask, createGeneratorStamp, createStampOnEffectStart } from ${JSON.stringify(`file://${summonCore}`)};
const dir = process.argv[2];
const answers = { componentPath: "src/components/Button", withStyles: true, withStories: true, withSsrTests: true };
const gen = pickGenerator("component", { framework: "react" });
await runGeneratorTask(execute(gen, { prompt: autoPrompt(answers), params: answers }), {
  cwd: dir,
  promptHandler: autoPrompt(answers),
  onEffectStart: createStampOnEffectStart(createGeneratorStamp(gen)),
  onLog: () => {},
});
`,
    );
    execFileSync("bun", [script, summonDir], { stdio: "pipe" });

    const a = snapshot(pragmaDir);
    const b = snapshot(summonDir);
    expect(a.size).toBeGreaterThan(0);
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    for (const [path, content] of a) {
      expect(b.get(path), `content of ${path}`).toBe(content);
    }
  }, 60000);
});
