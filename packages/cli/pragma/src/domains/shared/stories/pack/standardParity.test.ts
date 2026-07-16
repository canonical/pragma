/**
 * Standard-noun cutover parity — the bundled `standard` pack against the
 * real @canonical/code-standards graphs, resolved from node_modules
 * through the production loader chain (no fixture TTL).
 *
 * The hand-written standard domain is gone, so parity is SEMANTIC and
 * asserted directly against the graph: every standard the store carries
 * is reachable through the pack's list/lookup/categories/sample stories
 * with the same names and values (category, description, extends,
 * dos/donts code examples), by name, prefixed name, absolute IRI, and
 * glob. The accepted divergences from the deleted built-in are pinned in
 * PARITY_GAPS (`#testing`), not silently absorbed here.
 */

import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PARITY_GAPS } from "#testing";
import { parsePackageEntry } from "../../../refs/operations/parseRef.js";
import { bootStore } from "../../bootStore.js";
import compactUri from "../../compactUri.js";
import { DEFAULT_PREFIX_MAP } from "../../prefixes.js";
import { listDomainNames } from "../../suggestions/index.js";
import type { PragmaRuntime } from "../../types/index.js";
import { standardPack } from "./bundled/standardPack.js";
import compilePackStories, {
  type CompiledPackStories,
} from "./compilePackStories.js";
import validateStoryPackDefinition from "./validateStoryPackDefinition.js";

const PACK_SOURCE = "bundled:standard";

/** A real standard whose dos AND donts are non-empty on the live package. */
const LOOKUP_NAME = "react/component/props";

/** A real standard with cs:extends — pins the raw-IRI JSON contract. */
const EXTENDS_LOOKUP_NAME = "react/component/structure/context";

/** A near-miss query — must produce ranked suggestions. */
const NEAR_MISS_NAME = "code/function/puriti";

let store: Store;
let rt: PragmaRuntime;
let compiled: CompiledPackStories;

beforeAll(async () => {
  const boot = await bootStore({
    refs: [parsePackageEntry("@canonical/code-standards")],
  });
  store = boot.store;
  rt = { store } as PragmaRuntime;
  compiled = compilePackStories(standardPack, PACK_SOURCE, {
    ...DEFAULT_PREFIX_MAP,
  });
});

afterAll(() => store?.dispose());

/** The dos/donts row shape the pack projects for each code example. */
type ExampleRow = { caption?: string; language?: string; code?: string };

/** Resolve one lookup query at an optional detail level. */
async function lookupPack(
  name: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, string | readonly ExampleRow[]>> {
  const lookup = compiled.lookup;
  if (!lookup) throw new Error("standard pack must declare a lookup story");
  const result = await lookup.resolve(rt, [name], params);
  expect(result.errors).toEqual([]);
  const entity = result.results.at(0);
  if (entity === undefined) {
    throw new Error(`pack lookup found no result for "${name}"`);
  }
  return entity as Record<string, string | readonly ExampleRow[]>;
}

describe("standard pack definition", () => {
  it("round-trips as declarative JSON and validates as a v1 pack", () => {
    const raw: unknown = JSON.parse(JSON.stringify(standardPack));
    expect(validateStoryPackDefinition(raw, PACK_SOURCE)).toEqual(standardPack);
  });

  it("records every accepted divergence as a distinct entry", () => {
    expect(PARITY_GAPS.length).toBeGreaterThan(0);
    expect(new Set(PARITY_GAPS).size).toBe(PARITY_GAPS.length);
    for (const gap of PARITY_GAPS) {
      expect(gap.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("standard list parity", () => {
  let rows: Record<string, string>[];

  beforeAll(async () => {
    rows = await compiled.list.resolve(rt, {});
  });

  it("lists every named standard in the graph, with the uniform row shape", async () => {
    // The shared suggestions name query is the independent oracle for
    // which standards exist (same store, different query path).
    const allNames = await listDomainNames(store, "standard");
    expect(allNames.length).toBeGreaterThan(0);
    const listed = new Set(rows.map((row) => row.name));
    for (const name of allNames) {
      expect(listed.has(name), `"${name}" missing from standard list`).toBe(
        true,
      );
    }
    for (const row of rows) {
      expect(row.uri).toBeTruthy();
      expect(row.description).toBeTruthy();
    }
  });

  it("filters by category (value-free, case-insensitive)", async () => {
    const filtered = await compiled.list.resolve(rt, { category: "REACT" });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered).toEqual(rows.filter((row) => row.category === "react"));
  });

  it("returns zero rows (not an error) for an unknown category", async () => {
    // Pinned gap: the old list raised EMPTY_RESULTS here.
    await expect(
      compiled.list.resolve(rt, { category: "nonexistent" }),
    ).resolves.toEqual([]);
  });

  it("searches name and description case-insensitively", async () => {
    const found = await compiled.list.resolve(rt, { search: "folder" });
    expect(found.length).toBeGreaterThan(0);
    expect(found).toEqual(
      rows.filter(
        (row) =>
          row.name?.toLowerCase().includes("folder") ||
          row.description?.toLowerCase().includes("folder"),
      ),
    );
  });

  it("combines category and search conjunctively", async () => {
    const found = await compiled.list.resolve(rt, {
      category: "react",
      search: "folder",
    });
    expect(found.length).toBeGreaterThan(0);
    for (const row of found) {
      expect(row.category).toBe("react");
    }
  });
});

describe("standard lookup parity", () => {
  it("resolves base fields by name at the default (summary) level", async () => {
    const entity = await lookupPack(LOOKUP_NAME);
    expect(entity.name).toBe(LOOKUP_NAME);
    expect(entity.uri).toBeTruthy();
    expect(entity.category).toBe("react");
    expect(typeof entity.description).toBe("string");
    // Summary fetches no expands.
    expect(entity.dos).toBeUndefined();
    expect(entity.donts).toBeUndefined();
  });

  it("fetches full dos (code examples) at --detail digest", async () => {
    const entity = await lookupPack(LOOKUP_NAME, { detail: "digest" });
    const dos = entity.dos as readonly ExampleRow[];
    expect(Array.isArray(dos)).toBe(true);
    expect(dos.length).toBeGreaterThan(0);
    for (const example of dos) {
      expect(example.code).toBeTruthy();
      expect(example.language).toBeTruthy();
    }
    expect(entity.donts).toBeUndefined();
  });

  it("fetches dos AND donts at --detail detailed", async () => {
    const entity = await lookupPack(LOOKUP_NAME, { detail: "detailed" });
    expect((entity.dos as readonly ExampleRow[]).length).toBeGreaterThan(0);
    expect((entity.donts as readonly ExampleRow[]).length).toBeGreaterThan(0);
  });

  it("honors the legacy --detailed alias flag", async () => {
    const aliased = await lookupPack(LOOKUP_NAME, { detailed: true });
    const explicit = await lookupPack(LOOKUP_NAME, { detail: "detailed" });
    expect(aliased).toEqual(explicit);
  });

  it("keeps cs:extends as the raw IRI in data — a pinned gap", async () => {
    const entity = await lookupPack(EXTENDS_LOOKUP_NAME);
    const extendsIri = entity.extends as string;
    expect(extendsIri).toMatch(/^https?:\/\//);
    // Display-time compaction still yields the prefixed form.
    expect(compactUri(extendsIri, DEFAULT_PREFIX_MAP)).toMatch(/^cs:/);
  });

  it("resolves the same entity by absolute IRI and prefixed name", async () => {
    const byName = await lookupPack(LOOKUP_NAME);
    const uri = byName.uri as string;

    const byIri = await lookupPack(uri);
    expect(byIri.name).toBe(LOOKUP_NAME);

    const prefixed = compactUri(uri, DEFAULT_PREFIX_MAP);
    expect(prefixed).toMatch(/^cs:/);
    const byPrefixed = await lookupPack(prefixed);
    expect(byPrefixed.name).toBe(LOOKUP_NAME);
  });

  it("expands glob queries against the standard names", async () => {
    const lookup = compiled.lookup;
    if (!lookup) throw new Error("expected lookup story");
    const result = await lookup.resolve(rt, ["react/component/*"], {});
    expect(result.errors).toEqual([]);
    expect(result.results.length).toBeGreaterThan(1);
    for (const entity of result.results) {
      expect(String(entity.name)).toMatch(/^react\/component\//);
    }
  });

  it("reports misses with ranked suggestions", async () => {
    const lookup = compiled.lookup;
    if (!lookup) throw new Error("expected lookup story");
    const result = await lookup.resolve(rt, [NEAR_MISS_NAME], {});
    expect(result.results).toEqual([]);
    const error = result.errors.at(0);
    expect(error?.code).toBe("ENTITY_NOT_FOUND");
    expect(error?.suggestions).toContain("code/function/purity");
  });
});

describe("standard categories parity", () => {
  it("lists every category with its standard count (zero-counts kept)", async () => {
    const categories = compiled.verbs.find(
      (story) => story.verb === "categories",
    );
    if (!categories) throw new Error("expected a categories verb");
    const rows = await categories.resolve(rt, {});
    expect(rows.length).toBeGreaterThan(0);

    // Independent oracle: recount per category from the list story.
    const listRows = await compiled.list.resolve(rt, {});
    const expected = new Map<string, number>();
    for (const row of listRows) {
      if (row.category) {
        expected.set(row.category, (expected.get(row.category) ?? 0) + 1);
      }
    }
    for (const [category, count] of expected) {
      const row = rows.find((entry) => entry.name === category);
      expect(row, `category "${category}" missing`).toBeDefined();
      expect(Number(row?.count)).toBe(count);
    }
    // Categories beyond the expected map are zero-count declarations.
    for (const row of rows) {
      if (!expected.has(row.name ?? "")) {
        expect(Number(row.count)).toBe(0);
      }
    }
  });
});

describe("standard sample parity", () => {
  it("returns N full exemplars (highest disclosure) with the population size", async () => {
    const sample = compiled.sample;
    if (!sample) throw new Error("expected a sample story");
    const data = await sample.resolve(rt, { count: "2" });
    expect(data.samples).toHaveLength(2);
    const listRows = await compiled.list.resolve(rt, {});
    expect(data.totalCount).toBe(listRows.length);
    for (const entity of data.samples) {
      expect(entity.name).toBeTruthy();
      // Highest level: expands are fetched (arrays, possibly empty).
      expect(Array.isArray(entity.dos)).toBe(true);
      expect(Array.isArray(entity.donts)).toBe(true);
    }
  });
});
