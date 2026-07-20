/**
 * Stale-command gate: the published README and every doc under `docs/` must be
 * free of the retired v1 vocabulary. This is an ENFORCED test, not a lint — a
 * doc that reintroduces a removed command (or the retired `--llm` flag) fails
 * the build. The live `--format llm` form is deliberately NOT banned.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The package root (`packages/cli/next/`), resolved from this test's URL. */
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** Recursively collect every `.md` file under a directory. */
function collectMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/** One retired pattern and a human-readable reason for the failure message. */
interface BannedPattern {
  readonly pattern: RegExp;
  readonly reason: string;
}

/** The retired v1 vocabulary. The live `--format llm` form is intentionally absent. */
const BANNED: readonly BannedPattern[] = [
  {
    pattern: /\bupdate-refs\b/,
    reason: "retired `update-refs` (now `sources update`)",
  },
  { pattern: /pragma\s+llm\b/, reason: "retired `llm` tool" },
  { pattern: /pragma\s+data\b/, reason: "retired `data` noun (now `sources`)" },
  {
    pattern: /pragma\s+tokens\b/,
    reason: "retired plural `tokens` noun (now singular `token`)",
  },
  {
    pattern: /\btokens_(list|lookup|sample|add-config)\b/,
    reason: "retired plural `tokens_*` tools (now `token_*`)",
  },
  {
    pattern: /--llm\b/,
    reason:
      "retired `--llm` flag (now the `--format llm` form, auto-detected when piped)",
  },
];

// Every shipped doc must be free of retired vocabulary: the README plus every
// page under `docs/`. CHANGELOG.md (at the package root, outside `docs/`) is
// DELIBERATELY exempt — its migration table legitimately cites the retired
// names (`data`, `update-refs`, plural `tokens`) to tell readers what they
// became, so scanning it would false-positive on that historical vocabulary.
const files = [
  join(packageRoot, "README.md"),
  ...collectMarkdown(join(packageRoot, "docs")),
];

describe("stale-command gate — docs never mention retired v1 commands", () => {
  for (const file of files) {
    const rel = relative(packageRoot, file);
    it(`${rel} is free of retired commands`, () => {
      const content = readFileSync(file, "utf-8");
      for (const { pattern, reason } of BANNED) {
        expect(pattern.test(content), `${rel}: ${reason}`).toBe(false);
      }
    });
  }
});
