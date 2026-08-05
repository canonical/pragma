// =============================================================================
// The projection-mode matrix: auto / annotated / explicit × unannotated /
// annotated input. The mode changes WHAT the ontology projects; the
// provenance header names it; and the three modes' promises are each pinned
// here: auto consults nothing (and so survives broken annotations),
// annotated binds every knob, explicit projects the expose allowlist and
// nothing else — loudly.
//
// SDL comparisons across DIFFERENT modes strip the seven-line provenance
// header first: the header intentionally differs (it names the mode — that
// is its job), so "byte-identical" means header-for-header equal except the
// mode line, body byte-for-byte.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import { satisfiesContract } from "@canonical/prism-contract";
import { graphql } from "graphql";
import { afterEach, describe, expect, it } from "vitest";
import {
  CompilationError,
  type CompilerResult,
  compile,
  createStoreQueryFn,
} from "../../lib/compiler/index.js";
import { GRAPHQL } from "../../lib/shared/index.js";
import {
  ANNOTATED_BASE_TTL,
  ANNOTATED_TTL,
  MINIMAL_TTL,
  PREFIXES,
} from "../index.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const compileFixture = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<{
  result: CompilerResult;
  run: (source: string) => Promise<unknown>;
}> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(createStoreQueryFn(store), PREFIXES, options);
  const context = result.createContext(store);
  return {
    result,
    run: (source: string) =>
      graphql({ schema: result.schema, source, contextValue: context }),
  };
};

const HEADER_LINES = 7;
const headerOf = (sdl: string): string[] =>
  sdl.split("\n").slice(0, HEADER_LINES);
const bodyOf = (sdl: string): string =>
  sdl.split("\n").slice(HEADER_LINES).join("\n");

const codes = (result: CompilerResult): string[] =>
  result.diagnostics.map((d) => d.code);

describe("mode matrix — unannotated input", () => {
  it("auto ≡ annotated: headers differ ONLY in the mode line, bodies byte-for-byte", async () => {
    const auto = await compileFixture(MINIMAL_TTL, { mode: "auto" });
    const annotated = await compileFixture(MINIMAL_TTL, { mode: "annotated" });
    expect(codes(auto.result)).not.toContain("A006");
    const autoHeader = headerOf(auto.result.sdl);
    const annotatedHeader = headerOf(annotated.result.sdl);
    expect(autoHeader[3]).toBe("# mode: auto");
    expect(annotatedHeader[3]).toBe("# mode: annotated");
    expect(autoHeader.filter((_, i) => i !== 3)).toEqual(
      annotatedHeader.filter((_, i) => i !== 3),
    );
    expect(bodyOf(auto.result.sdl).length).toBeGreaterThan(0);
    expect(bodyOf(auto.result.sdl)).toBe(bodyOf(annotated.result.sdl));
  });

  it("explicit: the zero-type schema — TBox + node survive, A007 lists every class, contract satisfied", async () => {
    const { result } = await compileFixture(MINIMAL_TTL, { mode: "explicit" });
    expect([...result.mapped.types.keys()]).toEqual([]);
    expect([...result.mapped.interfaces.keys()]).toEqual([]);
    expect(
      Object.keys(result.schema.getQueryType()?.getFields() ?? {}).sort(),
    ).toEqual([
      "node",
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
    ]);
    const a007 = result.diagnostics.find((d) => d.code === "A007");
    expect(a007?.severity).toBe("info");
    expect(a007?.message).toContain("1 class(es)");
    expect(a007?.message).toContain("http://example.org/Thing");
    expect(satisfiesContract(result.sdl)).toEqual({
      satisfied: true,
      violations: [],
    });
  });
});

describe("mode matrix — annotated input", () => {
  it("auto consults nothing: bytes equal the unannotated-equivalent emission, plus the honest A006", async () => {
    const annotatedDoc = await compileFixture(ANNOTATED_TTL, { mode: "auto" });
    const baseDoc = await compileFixture(ANNOTATED_BASE_TTL, { mode: "auto" });
    // Same mode, so full byte equality — no header allowance needed.
    expect(annotatedDoc.result.sdl.length).toBeGreaterThan(0);
    expect(annotatedDoc.result.sdl).toBe(baseDoc.result.sdl);
    const a006 = annotatedDoc.result.diagnostics.find((d) => d.code === "A006");
    expect(a006?.severity).toBe("info");
    expect(a006?.message).toContain('mode "auto"');
    expect(codes(baseDoc.result)).not.toContain("A006");
    // Teeth: under "annotated" the same document emits DIFFERENT bytes
    // (the rename alone moves the type name), so auto provably ignored
    // load-bearing annotations rather than there being nothing to ignore.
    const bound = await compileFixture(ANNOTATED_TTL, { mode: "annotated" });
    expect(bodyOf(bound.result.sdl)).not.toBe(bodyOf(annotatedDoc.result.sdl));
  });

  it("auto is the escape hatch: broken annotations still compile (A006 only), annotated refuses them (A001)", async () => {
    const broken = `${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL}name> "Alpha" , "Beta" .
`;
    const auto = await compileFixture(broken, { mode: "auto" });
    expect(auto.result.schema.getType("Thing")).toBeDefined();
    expect(codes(auto.result)).toContain("A006");
    expect(codes(auto.result)).not.toContain("A001");
    await expect(compileFixture(broken, { mode: "annotated" })).rejects.toThrow(
      CompilationError,
    );
  });

  it("annotated binds every knob of the fixture", async () => {
    const { result } = await compileFixture(ANNOTATED_TTL, {
      mode: "annotated",
    });
    // rename + roots
    expect(result.schema.getType("Publication")).toBeDefined();
    expect(result.schema.getType("Book")).toBeUndefined();
    expect(result.sdl).toContain("publication(uri: String!): Publication");
    // abstract (coincident with the heuristic, exercised end to end)
    expect(result.sdl).toContain("interface Media");
    // forced embeddable: Badge has a NAMED instance, yet no uri, no roots
    const badgeBlock = /type Badge \{[^}]*\}/.exec(result.sdl)?.[0];
    expect(badgeBlock).toBeDefined();
    expect(badgeBlock).not.toContain("uri: ID!");
    expect(result.sdl).not.toContain("badges(");
    // nonNull + forced list cardinality
    const pubBlock = /type Publication implements [^{]*\{[^}]*\}/.exec(
      result.sdl,
    )?.[0];
    expect(pubBlock).toContain("title: String!");
    expect(pubBlock).toContain("tags: [String!]!");
    // verbatim property rename on the Author side
    const authorBlock = /type Author implements Node \{[^}]*\}/.exec(
      result.sdl,
    )?.[0];
    expect(authorBlock).toContain("authored");
    // annotation-declared inverse joined as a declared pair
    expect(
      result.mapped.ir.properties.get("http://example.org/wrote")?.inverse,
    ).toBe("http://example.org/writtenBy");
    expect(
      result.mapped.ir.properties.get("http://example.org/writtenBy")?.inverse,
    ).toBe("http://example.org/wrote");
  });

  it("explicit projects the allowlist and nothing else, loudly", async () => {
    const { result, run } = await compileFixture(ANNOTATED_TTL, {
      mode: "explicit",
    });
    // Only the exposed classes project: Publication + Author types, Media
    // interface; Secret and Badge do not exist in the schema.
    expect([...result.mapped.types.keys()].sort()).toEqual([
      "Author",
      "Publication",
    ]);
    expect([...result.mapped.interfaces.keys()]).toEqual(["Media"]);
    expect(result.schema.getType("Secret")).toBeUndefined();
    expect(result.schema.getType("Badge")).toBeUndefined();
    // Root fields fall out with the types.
    const roots = Object.keys(result.schema.getQueryType()?.getFields() ?? {});
    expect(roots).toContain("publication");
    expect(roots).toContain("publications");
    expect(roots).toContain("author");
    expect(roots).not.toContain("secret");
    expect(roots).not.toContain("badge");
    // A007 aggregates the dropped set once, sorted.
    const a007 = result.diagnostics.filter((d) => d.code === "A007");
    expect(a007).toHaveLength(1);
    expect(a007[0]?.message).toContain("2 class(es)");
    expect(a007[0]?.message).toContain(
      "http://example.org/Badge, http://example.org/Secret",
    );
    // A008 omits the fields pointing outside the allowlist — one diagnostic
    // per container (sealedIn and badge drop on the Media interface AND on
    // the inheriting Publication type, like every per-container field
    // finding), and the field is GONE, not a String leak.
    const a008 = result.diagnostics.filter((d) => d.code === "A008");
    expect(a008).toHaveLength(4);
    expect(new Set(a008.map((d) => d.severity))).toEqual(new Set(["warning"]));
    expect(a008.some((d) => d.message.includes("Media.sealedIn"))).toBe(true);
    expect(a008.some((d) => d.message.includes("Publication.sealedIn"))).toBe(
      true,
    );
    expect(
      a008.some(
        (d) =>
          d.source === "http://example.org/sealedIn" &&
          d.message.includes("http://example.org/Secret"),
      ),
    ).toBe(true);
    expect(a008.some((d) => d.source === "http://example.org/badge")).toBe(
      true,
    );
    const pubBlock = /type Publication implements [^{]*\{[^}]*\}/.exec(
      result.sdl,
    )?.[0];
    expect(pubBlock).not.toContain("sealedIn");
    expect(pubBlock).not.toContain("badge");
    // The exposed pair keeps its dual-direction inverse field (the derived
    // list name pluralizes writtenBy → writtenBies).
    expect(pubBlock).toContain("writtenBies");
    // The emission still satisfies the contract.
    expect(satisfiesContract(result.sdl)).toEqual({
      satisfied: true,
      violations: [],
    });
    // The TBox stays COMPLETE (Secret is browsable) but the population of
    // an unexposed class answers empty/0 — instanceCount is defined as the
    // population `instances` paginates.
    const tbox = (await run(`{
      secret: ontologyClass(uri: "http://example.org/Secret") {
        label
        instanceCount
        instances { edges { node { uri } } }
      }
      publication: ontologyClass(uri: "http://example.org/Book") {
        instanceCount
      }
      media: ontologyClass(uri: "http://example.org/Media") {
        instanceCount
      }
    }`)) as {
      errors?: unknown;
      data?: {
        secret: {
          label: string;
          instanceCount: number;
          instances: { edges: unknown[] };
        };
        publication: { instanceCount: number };
        media: { instanceCount: number };
      };
    };
    expect(tbox.errors).toBeUndefined();
    expect(tbox.data?.secret.label).toBe("Secret");
    expect(tbox.data?.secret.instanceCount).toBe(0);
    expect(tbox.data?.secret.instances.edges).toEqual([]);
    // Projected classes answer their real populations (type + interface).
    expect(tbox.data?.publication.instanceCount).toBe(1);
    expect(tbox.data?.media.instanceCount).toBe(0);
  });

  it("explicit with a fully exposed ontology emits no A007", async () => {
    const { result } = await compileFixture(
      `${MINIMAL_TTL}
<http://example.org/Thing> <${GRAPHQL}expose> true .
`,
      { mode: "explicit" },
    );
    expect(codes(result)).not.toContain("A007");
    expect(result.schema.getType("Thing")).toBeDefined();
  });
});
