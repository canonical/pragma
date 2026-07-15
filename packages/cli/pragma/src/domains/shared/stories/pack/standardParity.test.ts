/**
 * Standard-noun parity pilot — the built-in `standard` read stories vs the
 * declarative pack definition in `standardParityFixtures.ts`.
 *
 * This file wires the built-in `standard` noun into the reusable
 * {@link packParity} harness: both paths run against the real
 * @canonical/code-standards graphs, resolved from node_modules through the
 * production loader chain, and every consumer-facing surface is asserted
 * byte-identical unless the v0 pack format cannot reach it — in which case
 * the divergence is pinned in an allowlist drawn from {@link PARITY_GAPS}.
 * Where a surface diverges for a single known reason, a `normalize` confines
 * the divergence: the raw forms must differ AND the normalized forms must be
 * byte-equal, so the delta is exactly the gap and nothing more. Nothing is
 * cut over: the built-in stories stay untouched and the pack is compiled
 * directly.
 */

import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { PARITY_GAPS, STANDARD_PACK_STORY } from "#testing";
import {
  type PackParityNotFoundContract,
  packParity,
  type SurfaceNormalize,
} from "../../../../testing/packParity.js";
import { parsePackageEntry } from "../../../refs/operations/parseRef.js";
import { lookupStandard } from "../../../standard/operations/index.js";
import {
  standardListStory,
  standardLookupStory,
} from "../../../standard/stories.js";
import { bootStore } from "../../bootStore.js";
import compactUri from "../../compactUri.js";
import { PREFIX_MAP } from "../../prefixes.js";
import type { PragmaRuntime } from "../../types/index.js";

const PACK_SOURCE = "standardParityFixtures";

/**
 * Fetch the full gap-ledger entry beginning with `prefix`, so every
 * allowlist reason is a verbatim member of {@link PARITY_GAPS} (the
 * harness's `knownDivergences` check then enforces the linkage).
 */
function gap(prefix: string): string {
  const entry = PARITY_GAPS.find((candidate) => candidate.startsWith(prefix));
  if (entry === undefined) {
    throw new Error(`no PARITY_GAP begins with "${prefix}"`);
  }
  return entry;
}

/** A real standard with cs:extends — pins the JSON data-compaction gap. */
const EXTENDS_LOOKUP_NAME = "react/component/structure/context";

/** True for a non-null object, so JSON-parsed surfaces can be indexed. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Strip the built-in's single leading URI field line — the one v0 lookup
 * rendering gap. Confines the plain/llm divergence to exactly that line: the
 * built-in carries one such line, the pack none, so at most one line is ever
 * removed and the normalizer cannot mask an unrelated divergence.
 */
function stripUriLine(marker: "  URI: " | "- URI: "): SurfaceNormalize {
  return (rendered) => {
    if (typeof rendered !== "string") {
      throw new Error("uri-field normalizer expects a rendered string surface");
    }
    const lines = rendered.split("\n");
    const kept = lines.filter((line) => !line.startsWith(marker));
    expect(lines.length - kept.length).toBeLessThanOrEqual(1);
    return kept.join("\n");
  };
}

/**
 * Compact the `extends` IRI in a rendered lookup JSON surface. The built-in
 * compacts `extends` in resolved data (`cs:…`) while the pack keeps the raw
 * IRI; compacting both confines the JSON divergence to exactly that field.
 */
function compactExtendsJson(
  prefixes: Readonly<Record<string, string>>,
): SurfaceNormalize {
  return (rendered) => {
    if (typeof rendered !== "string") {
      throw new Error("extends normalizer expects a rendered JSON string");
    }
    const parsed: unknown = JSON.parse(rendered);
    if (!isRecord(parsed)) {
      throw new Error("extends normalizer expects a JSON object surface");
    }
    const extendsValue = parsed.extends;
    if (typeof extendsValue !== "string") {
      throw new Error("extends normalizer expects a string `extends` field");
    }
    return JSON.stringify(
      { ...parsed, extends: compactUri(extendsValue, prefixes) },
      null,
      2,
    );
  };
}

/**
 * Drop the authored recovery guidance from a not-found contract, keeping the
 * code, message, and ranked suggestions. Confines the not-found divergence to
 * exactly `recovery`/`crossDomain` — the authored copy the pack cannot
 * express (see {@link PARITY_GAPS} "lookup recovery copy").
 */
function stripRecovery(contract: PackParityNotFoundContract): unknown {
  const { code, message, suggestions } = contract;
  return { code, message, suggestions };
}

packParity({
  noun: "standard",
  definition: STANDARD_PACK_STORY,
  source: PACK_SOURCE,
  prefixes: { ...PREFIX_MAP },
  knownDivergences: PARITY_GAPS,
  bootRuntime: async () => {
    const boot = await bootStore({
      refs: [parsePackageEntry("@canonical/code-standards")],
    });
    return {
      rt: { store: boot.store } as PragmaRuntime,
      dispose: () => boot.store.dispose(),
    };
  },
  list: {
    story: standardListStory,
    expectedDivergences: {
      plain: gap("list plain template"),
      llm: gap("list llm template"),
      // Condensed MCP text is the llm formatter wrapped — same gap.
      condensed: gap("list llm template"),
      // json + envelope are byte-identical (summary rows match exactly).
    },
    // Wave 3 supplies real `paramVariations` here once packs gain authorable
    // filters; standard's pack declares none, so the default view suffices.
  },
  lookup: {
    story: standardLookupStory,
    names: [
      // Standards without cs:extends — lookup json is byte-identical.
      { name: "code/function/purity" },
      { name: "react/component/props" },
      // With cs:extends — the built-in compacts extends in resolved data
      // while the pack keeps the raw IRI, so lookup json diverges. The
      // normalizer compacts both, confirming the delta is only that field.
      {
        name: EXTENDS_LOOKUP_NAME,
        expectedDivergences: {
          json: {
            reason: gap("lookup data compaction"),
            normalize: compactExtendsJson(PREFIX_MAP),
          },
        },
      },
    ],
    nearMiss: "code/function/puriti",
    expectedDivergences: {
      // The built-in renders a leading `URI:` field the pack cannot declare;
      // stripping that single line confirms the rest is byte-identical.
      plain: {
        reason: gap("lookup uri field"),
        normalize: stripUriLine("  URI: "),
      },
      llm: {
        reason: gap("lookup uri field"),
        normalize: stripUriLine("- URI: "),
      },
      // MCP defaults lookup to detailed (full dos/donts entity); the pack
      // has one fixed summary shape, so envelope + condensed diverge. The
      // shape gap is broad, so these stay unconfined (reason-only).
      envelope: gap("lookup detailed toggle"),
      condensed: gap("lookup detailed toggle"),
      // json is byte-identical except for the cs:extends case above.
    },
    // The reduced LookupResult errors are identical, but the built-in's
    // thrown error carries recovery copy (`List available standards.`) the
    // pack cannot author. Reaching past lookupMany surfaces that divergence,
    // confined by stripRecovery to leave code/message/suggestions identical.
    nearMissExpectedDivergence: gap("lookup recovery copy"),
    nearMissNormalize: stripRecovery,
    resolveBuiltinNotFound: async (rt, nearMiss) => {
      try {
        await lookupStandard(rt.store, nearMiss);
      } catch (error) {
        if (error instanceof PragmaError) {
          return {
            code: error.code,
            message: error.message,
            suggestions: error.suggestions,
            recovery: error.recovery,
            crossDomain: error.crossDomain,
          };
        }
        throw error;
      }
      throw new Error(
        `near-miss "${nearMiss}" unexpectedly resolved to a standard`,
      );
    },
  },
});

describe("standard parity-gap ledger", () => {
  it("records every known gap as a distinct, non-empty capability entry", () => {
    expect(PARITY_GAPS.length).toBeGreaterThan(0);
    expect(new Set(PARITY_GAPS).size).toBe(PARITY_GAPS.length);
    for (const entry of PARITY_GAPS) {
      expect(entry.trim().length).toBeGreaterThan(0);
    }
  });
});
