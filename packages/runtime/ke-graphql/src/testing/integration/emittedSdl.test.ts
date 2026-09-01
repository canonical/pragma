// =============================================================================
// Golden SDL pin: the DEFAULT emission of every contract fixture, captured
// byte-for-byte in __fixtures__/<name>.sdl.txt.
//
// This is the cross-version pin the other suites do not provide: the
// determinism test proves one build agrees with itself, the header test pins
// seven lines, gate G-1 checks contract subsumption — none of them compare
// against a PRE-CHANGE emission. These goldens do. Any commit that moves a
// single byte of the default emission fails here and must justify itself by
// regenerating the goldens in the same change — silently shifting emitted
// names, order, or descriptions is not a thing that can happen.
//
// The files are compared as whole strings (never trimmed, never normalized):
// a golden is a byte pin, not a prose expectation.
// =============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestStore } from "@canonical/ke/testing";
import { afterEach, describe, expect, it } from "vitest";
import { compile, createStoreQueryFn } from "../../lib/compiler/index.js";
import {
  BLANK_NODES_TTL,
  DOMAINLESS_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INHERITANCE_TTL,
  INVERSE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "../index.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

/** The same eight-fixture corpus gate G-1 runs over. */
const FIXTURES: Record<string, string> = {
  minimal: MINIMAL_TTL,
  inheritance: INHERITANCE_TTL,
  inverse: INVERSE_TTL,
  "blank-nodes": BLANK_NODES_TTL,
  domainless: DOMAINLESS_TTL,
  "edge-cases": EDGE_CASES_TTL,
  shacl: SHACL_TTL,
  "ds-realistic": DS_REALISTIC_TTL,
};

const golden = (name: string): string =>
  readFileSync(
    join(import.meta.dirname, "__fixtures__", `${name}.sdl.txt`),
    "utf8",
  );

describe("golden SDL pin: default emissions are byte-identical to the captured goldens", () => {
  for (const [name, ttl] of Object.entries(FIXTURES)) {
    it(`the ${name} default emission matches its golden byte-for-byte`, async () => {
      const { store, cleanup } = await createTestStore({
        ttl,
        prefixes: PREFIXES,
      });
      cleanups.push(cleanup);
      const result = await compile(createStoreQueryFn(store), PREFIXES, {});
      // Guard against a vacuous pass: an empty golden would equal an empty
      // emission without pinning anything.
      expect(result.sdl.length).toBeGreaterThan(0);
      expect(result.sdl).toBe(golden(name));
    });
  }
});
