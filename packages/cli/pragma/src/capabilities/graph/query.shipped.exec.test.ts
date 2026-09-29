/**
 * `graph query` over the SHIPPED graph, addressed the way pragma addresses it.
 *
 * The two queries below are the ones a user actually typed, having copied the
 * names out of `graph inspect` and `variable list`. Both were SPARQL parse
 * errors — the graph's local names carry dots, slashes and leading dashes that
 * `PN_LOCAL` cannot — and the failure arrived as a Unicode-range dump pointing
 * at line 16 of a one-line query.
 *
 * Against the fixture graph this could only be argued; the names in question
 * are the SHIPPED pack's, so this is where it is proven.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import { graphModule } from "./index.js";

type Select = { type: string; bindings?: readonly unknown[] };

const queryVerb = graphModule.verbs.find(
  (v) => verbKey(v.path) === "graph query",
) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(() => {
  rt = bootRuntime(TEST_FLAGS);
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

const rows = async (sparql: string): Promise<readonly unknown[]> => {
  const result = (await queryVerb.run({ sparql }, rt)) as Select;
  expect(result.type).toBe("select");
  return result.bindings ?? [];
};

describe("a name pragma printed can be pasted back (PROTECTED)", () => {
  it("answers a block addressed as `graph inspect` prints it", async () => {
    const bindings = await rows(
      "SELECT ?p ?o WHERE { ds:global.component.button ?p ?o } LIMIT 2",
    );
    expect(bindings).toHaveLength(2);
  });

  it("answers a variable addressed as `variable list` prints it", async () => {
    const bindings = await rows(
      "SELECT ?p ?o WHERE { dt:s4/web/--color-text ?p ?o } LIMIT 2",
    );
    expect(bindings.length).toBeGreaterThan(0);
  });

  it("still answers the absolute form, byte for byte the same", async () => {
    const prefixed = await rows(
      "SELECT ?p ?o WHERE { ds:global.component.button ?p ?o } ORDER BY ?p ?o",
    );
    const absolute = await rows(
      "SELECT ?p ?o WHERE { <https://ds.canonical.com/global.component.button> ?p ?o } ORDER BY ?p ?o",
    );
    expect(prefixed).toEqual(absolute);
  });
});

describe("an invented namespace is named, not answered with silence", () => {
  // The recorded failure: nine queries against a namespace that does not
  // exist, nine "No results", and a guess. A declared PREFIX always parses, so
  // only a check against the store's own prefix map can say why nothing matched.
  const INVENTED =
    "PREFIX tok: <https://example.invalid/tokens#> SELECT ?c WHERE { ?c tok:uses ?t }";

  it("says exactly which prefix is not a namespace of this graph, on both surfaces", async () => {
    const result = await queryVerb.run({ sparql: INVENTED }, rt);
    const { notice, json } = queryVerb.output.formatters;
    const cli = notice?.(result, "cli") as string;
    expect(cli).toContain(
      "Prefix `tok:` <https://example.invalid/tokens#> is not a namespace of this graph",
    );
    expect(cli).toContain("`pragma ontology list`");
    expect(notice?.(result, "mcp")).toContain("`ontology_list {}`");
    // The finding explains the emptiness; the payload stays the engine's shape.
    const payload = JSON.parse(json(result));
    expect(payload).toMatchObject({ type: "select", bindings: [] });
    expect(payload).not.toHaveProperty("unknownPrefixes");
  });

  it("says nothing about prefixes when the query declares only real ones, or has rows", async () => {
    const real = await queryVerb.run(
      {
        sparql:
          "PREFIX ds: <https://ds.canonical.com/> SELECT ?s WHERE { ?s a ds:NoSuchClass }",
      },
      rt,
    );
    const notice = queryVerb.output.formatters.notice?.(real, "cli") as string;
    expect(notice).toContain("the query ran and matched nothing");
    expect(notice).not.toContain("is not a namespace");
    const hit = await queryVerb.run(
      {
        sparql: `${INVENTED.replace("WHERE { ?c tok:uses ?t }", "WHERE { ?c ?p ?t } LIMIT 1")}`,
      },
      rt,
    );
    expect(queryVerb.output.formatters.notice?.(hit, "cli")).toBeUndefined();
    expect(hit).not.toHaveProperty("unknownPrefixes");
  });
});
