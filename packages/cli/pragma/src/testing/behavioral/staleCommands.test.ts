/**
 * Stale-command gate: the published README and every doc under `docs/` must be
 * free of every command, noun and flag this CLI has removed. This is an
 * ENFORCED test, not a lint — a doc that reintroduces one fails the build. The
 * live `--format llm` form is deliberately NOT banned; the removed `--llm` flag
 * is.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The package root (`packages/cli/pragma/`), resolved from this test's URL. */
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

/** The removed vocabulary. The live `--format llm` form is intentionally absent. */
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
    pattern: /\btokens_(list|lookup|sample)\b/,
    reason: "retired plural `tokens_*` tools (now `token_*`)",
  },
  {
    pattern: /pragma\s+token\s+add-config\b|\btoken_add-config\b/,
    reason:
      "removed `token add-config` — the declared-content grammar has no verb for mutations, and there is no replacement",
  },
  {
    pattern: /--all-tiers\b/,
    reason:
      "removed `--all-tiers` — `block list` narrows by neither tier nor channel now, so there is nothing left to widen",
  },
  {
    pattern: /\btier-channel\b/,
    reason:
      "retired `tier-channel` scoping model — reads are unscoped, so a doc naming a tier/channel model promises a narrowing no verb performs",
  },
  {
    pattern: /--llm\b/,
    reason:
      "retired `--llm` flag (now the `--format llm` form, auto-detected when piped)",
  },
  {
    pattern: /pragma\s+ontology\s+show\b|\bontology_show\b/,
    reason:
      "removed `ontology show` — the deprecated alias of `ontology lookup`, which is now the only by-name ontology read",
  },
];

// Every shipped doc must be free of retired vocabulary: the README plus every
// page under `docs/`. CHANGELOG.md (at the package root, outside `docs/`) is
// DELIBERATELY exempt — its migration table legitimately cites the removed
// names (`data`, `update-refs`, plural `tokens`, `token add-config`) to tell
// readers what they became or that they are gone, so scanning it would
// false-positive on exactly the prose that exists to help.
const files = [
  join(packageRoot, "README.md"),
  ...collectMarkdown(join(packageRoot, "docs")),
];

describe("stale-command gate — docs never mention a removed command", () => {
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
