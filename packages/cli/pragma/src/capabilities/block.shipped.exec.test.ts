/**
 * The `block` story's declared vocabulary, EXECUTED against the shipped pack
 * (PROTECTED).
 *
 * `block.parity.test.ts` asserts the story's semantics over a FIXTURE graph the
 * repository writes. That is a real check, but it can only ever prove the story
 * agrees with the fixture — and when the two drifted apart, that is exactly
 * what happened: the story read `ds:whenToUse`/`ds:whenNotToUse`, the fixture
 * obligingly declared them, the suite stayed green, and every real install
 * rendered `block lookup` with no usage narrative at all, because the ontology
 * had long since retired both terms in favour of a single `ds:usage`. Nothing
 * in the pipeline treats that as an error: the GraphQL projection omits a name
 * it cannot express the way OPTIONAL omits an unbound variable, and the
 * renderer skips a section with no value. Silence all the way down.
 *
 * So this file boots the SHIPPED graph and asserts what a fixture structurally
 * cannot. It distinguishes two failures that look identical in the output but
 * are not the same defect:
 *
 * - a declared property the ontology does not define is a STORY bug — the CLI
 *   is asking for a name the schema can never answer, and no upstream content
 *   edit can ever make it render. That is this defect, and it is forbidden here.
 * - a declared property the ontology defines but no instance asserts yet is a
 *   CONTENT gap upstream (`ds:figmaLink` is one today). The story is correct and
 *   degrades gracefully; that is not this suite's business.
 *
 * The `graph/examples.exec.test.ts` precedent: an example is a promise to a
 * stranger, and only running it against what actually ships reads it as one. A
 * declared property is the same kind of promise.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isNestedExpand,
  type PackExpandSelect,
} from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { bootRuntime } from "../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { TEST_FLAGS } from "../testing/helpers/projectCli.js";
import { declaredStories, storyModules } from "./distribution.js";

const story = declaredStories.get("block");
if (!story?.lookup) {
  throw new Error('pragma.conf.ts declares no "block" lookup');
}
const blockLookup = story.lookup;

const blockModule = storyModules.get("block");
if (!blockModule) {
  throw new Error('pragma.conf.ts declares no story for "block"');
}

const lookupVerb = blockModule.verbs.find(
  (v) => verbKey(v.path) === "block lookup",
) as VerbSpec;

/**
 * The block classes the lookup addresses, read from the story rather than
 * retyped — a class added there widens these checks with it.
 */
const TYPE_VALUES = (blockLookup.types ?? []).join(" ");

/** One graph term the story names, paired with the site that declares it. */
interface DeclaredTerm {
  readonly what: string;
  readonly property: string;
}

/**
 * Every term an `expand.select` names, to whatever depth it nests.
 *
 * WALKED, not listed. A hand-maintained enumeration would carry this file's own
 * defect one level down: `ds:hasModifier`, `ds:propertyType` and `ds:optional`
 * could be retired exactly the way `ds:whenToUse` was, and `block lookup` would
 * quietly lose its modifier values and its property table while a list nobody
 * thought to update stayed green. Recursing over the declaration instead means
 * a term added to any `select` is covered the moment it is declared, by the
 * author who declares it and without their help.
 */
function selectedTerms(
  site: string,
  select: readonly PackExpandSelect[],
): readonly DeclaredTerm[] {
  return select.flatMap((entry) =>
    isNestedExpand(entry)
      ? [
          {
            what: `${site} → nested expand "${entry.name}"`,
            property: entry.relation,
          },
          ...selectedTerms(`${site} → "${entry.name}"`, entry.select),
        ]
      : [
          {
            what: `${site} → field "${entry.name}"`,
            property: entry.property,
          },
        ],
  );
}

/**
 * Every property the story names in the graph, read from the declaration.
 *
 * The identity property, fields, sections, expand relations and everything
 * selected beneath them all name graph vocabulary and all fail the same silent
 * way, so all of them are held to the same standard. `by` is included because a
 * lookup whose identity property the ontology has retired resolves NOTHING —
 * the loudest form of the same defect, and the one no rendering test would
 * reach, since there would be no entity to render.
 *
 * One case per declaration SITE rather than per distinct term: `ds:name` is
 * named at six of them, and a failure that names the site it was declared at
 * is the one a reader can act on.
 */
const DECLARED_PROPERTIES: readonly DeclaredTerm[] = [
  { what: "lookup `by`", property: blockLookup.by },
  ...(blockLookup.fields ?? []).map((f) => ({
    what: `field "${f.name}"`,
    property: f.property,
  })),
  ...(blockLookup.sections ?? []).map((s) => ({
    what: `section "${s.name}"`,
    property: s.property,
  })),
  ...(blockLookup.expand ?? []).flatMap((e) => [
    { what: `expand "${e.name}"`, property: e.relation },
    ...selectedTerms(`expand "${e.name}"`, e.select),
  ]),
];

/**
 * Standard RDF vocabulary, which no domain ontology declares and every graph
 * carries — the same exemption, for the same reason, that the token stories'
 * shipped sweep makes: the distribution's own vocabulary declaration leaves
 * `rdfs:label` out because "the kernel treats standard vocabulary as
 * universal", and the shipped pack accordingly carries no T-box triple about
 * it at all. Nothing upstream can retire a W3C term, which is the defect this
 * file exists to catch.
 *
 * A readable list rather than a widened ASK, so the sweep stays a hard
 * requirement on every DOMAIN term.
 */
const STANDARD_VOCABULARY = new Set(["rdfs:label", "rdfs:comment"]);

/**
 * The property STEPS one declaration names — more than one when it is a path.
 *
 * A SPARQL-lane declaration may read a grandchild through a path
 * (`ds:consumesSymbol/rdfs:label`), and every domain step of it is a term the
 * ontology has to define: a retired step anywhere along a path renders exactly
 * as silently as a retired single term. Split rather than skipped — a path
 * spliced whole into the ASK's subject position would not even parse, so the
 * check would have raised instead of judging, and skipping paths outright
 * would leave their steps unguarded.
 *
 * An absolute IRI is left whole: a `/` inside `https://…` is not a path
 * separator, which is the grammar's own test for a property path.
 */
function pathSteps(property: string): readonly string[] {
  if (!property.includes("/") || property.includes("://")) {
    return STANDARD_VOCABULARY.has(property) ? [] : [property];
  }
  return property
    .split("/")
    .map((step) => step.replace(/^\^/, "").replace(/[*+?]$/, ""))
    .filter((step) => step !== "" && !STANDARD_VOCABULARY.has(step));
}

/** The IRI of the block whose usage narrative is asserted on below. */
const BUTTON = "https://ds.canonical.com/global.component.button";

// ONE store for the file — booting the shipped pack is the expensive part, and
// this package already contends under parallel runs.
let rt: PragmaRuntime;
beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  // Load the shipped store HERE, once. `it.each` splits the vocabulary check
  // into one small case per declared property, and whichever ran first would
  // otherwise pay the whole lazy-load cost and time out under contention.
  await rt.store.get();
}, 60_000);
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** One scalar from the shipped graph, queried directly. */
async function scalar(query: string): Promise<string | undefined> {
  const result = await rt.query.sparql(query);
  if (result.type !== "select") return undefined;
  const row = result.bindings[0];
  return row === undefined ? undefined : Object.values(row)[0];
}

/** The `llm` rendering of `block lookup <value>`. */
async function renderLookup(value: string): Promise<string> {
  const out = (await lookupVerb.run({ name: [value] }, rt)) as never;
  return lookupVerb.output.formatters.llm(out);
}

describe("the `block` story declares vocabulary the shipped ontology defines (PROTECTED)", () => {
  it("declares at least one property to check", () => {
    expect(DECLARED_PROPERTIES.length).toBeGreaterThan(0);
  });

  it.each(DECLARED_PROPERTIES)(
    "$what reads $property, which the shipped ontology defines",
    async ({ what, property }) => {
      for (const hop of pathSteps(property)) {
        const result = await rt.query.sparql(
          [
            "ASK {",
            `  ${hop} a ?kind .`,
            "  VALUES ?kind { owl:DatatypeProperty owl:ObjectProperty }",
            "}",
          ].join("\n"),
        );
        expect(result.type).toBe("ask");
        expect(
          result.type === "ask" ? result.result : false,
          `${what} reads ${property}, whose hop ${hop} the shipped ontology does not define — it can never render, for any block, on any install`,
        ).toBe(true);
      }
    },
  );
});

describe("block lookup lists the tokens a block consumes (PROTECTED)", () => {
  it("renders one row per binding record, with all six identity columns", async () => {
    // The binding records are the design system's, derived from the anatomies,
    // and they ride the embedded snapshot — so the ONE thing a fixture cannot
    // prove is that the shipped corpus reaches this expand at all. Button is
    // asserted on rather than any block: it is the block whose anatomy every
    // other lookup test reads, and it carries bindings on its own tree AND on
    // the tree of the icon it embeds.
    const records = await scalar(
      `SELECT (COUNT(*) AS ?n) WHERE { <${BUTTON}> ds:hasTokenBinding ?r }`,
    );
    expect(Number(records)).toBeGreaterThan(0);

    const llm = await renderLookup(BUTTON);
    expect(llm).toContain("### Tokens");
    // The note, because a rank column without it is a number with no stated
    // meaning.
    expect(llm).toContain("rank is the position in that chain");

    // One rendered row per record, and every row carrying the two columns the
    // GraphQL lane cannot derive (neither `anatomy:styleKey` nor
    // `anatomy:styleState` has an rdfs:domain, so no field exists for either
    // on `TokenBinding`). Their absence is what made two of Button's rows
    // byte-identical, so their presence is the assertion.
    const rows = (llm.split("### Tokens")[1] ?? "")
      .split("\n")
      .filter((line) => line.startsWith("- symbol: "));
    expect(rows).toHaveLength(Number(records));
    for (const row of rows) {
      expect(row).toContain(" | key: ");
      expect(row).toContain(" | node: ");
    }
    // And no two rows the same — the defect a dropped identity column causes.
    expect(new Set(rows).size).toBe(rows.length);
  });

  it("blanks the via on a block's own tree and prints an inherited one", async () => {
    // `ds:viaBlock` is asserted on every record and its own definition says it
    // equals the block in the own-tree case, so an unconditional column put
    // the block's own name in every one of its rows.
    const ownTree = await scalar(
      [
        "SELECT (COUNT(*) AS ?n) WHERE {",
        `  <${BUTTON}> ds:hasTokenBinding ?r .`,
        `  ?r ds:viaBlock <${BUTTON}> .`,
        "}",
      ].join("\n"),
    );
    expect(Number(ownTree)).toBeGreaterThan(0);

    const llm = await renderLookup(BUTTON);
    const rows = (llm.split("### Tokens")[1] ?? "")
      .split("\n")
      .filter((line) => line.startsWith("- symbol: "));
    expect(rows.filter((row) => !row.includes(" | via: "))).toHaveLength(
      Number(ownTree),
    );

    // A block whose bindings are ALL inherited, read from the graph rather
    // than named here: every row of its section must carry a via.
    const inheritor = await scalar(
      [
        "SELECT ?b WHERE {",
        `  VALUES ?class { ${TYPE_VALUES} }`,
        "  ?b a ?class ; ds:hasTokenBinding ?r .",
        "  FILTER NOT EXISTS { ?b ds:hasTokenBinding/ds:viaBlock ?b }",
        "}",
        "ORDER BY ?b",
        "LIMIT 1",
      ].join("\n"),
    );
    expect(
      inheritor,
      "no shipped block carries only inherited bindings",
    ).toBeDefined();
    const inheritedRows = (
      (await renderLookup(inheritor as string)).split("### Tokens")[1] ?? ""
    )
      .split("\n")
      .filter((line) => line.startsWith("- symbol: "));
    expect(inheritedRows.length).toBeGreaterThan(0);
    for (const row of inheritedRows) expect(row).toContain(" | via: ");
  });

  it("prints no Tokens heading for a block that consumes nothing", async () => {
    // The shape every other section on this lookup has when it is empty. Read
    // from the graph, because which blocks have no bindings is upstream's to
    // change.
    const uri = await scalar(
      [
        "SELECT ?b WHERE {",
        `  VALUES ?class { ${TYPE_VALUES} }`,
        "  ?b a ?class .",
        "  FILTER NOT EXISTS { ?b ds:hasTokenBinding ?r }",
        "}",
        "ORDER BY ?b",
        "LIMIT 1",
      ].join("\n"),
    );
    expect(uri, "every shipped block carries bindings").toBeDefined();
    expect(await renderLookup(uri as string)).not.toContain("### Tokens");
  });
});

describe("the shipped graph carries the usage narrative on every block (PROTECTED)", () => {
  it("asserts ds:usage on every block, and neither retired term on any", async () => {
    const blocks = await scalar(
      [
        "SELECT (COUNT(DISTINCT ?b) AS ?n) WHERE {",
        `  VALUES ?class { ${TYPE_VALUES} }`,
        "  ?b a ?class .",
        "}",
      ].join("\n"),
    );
    const withUsage = await scalar(
      [
        "SELECT (COUNT(DISTINCT ?b) AS ?n) WHERE {",
        `  VALUES ?class { ${TYPE_VALUES} }`,
        "  ?b a ?class ; ds:usage ?u .",
        "}",
      ].join("\n"),
    );
    expect(Number(blocks)).toBeGreaterThan(0);
    expect(withUsage).toBe(blocks);

    // The retirement itself, pinned: reading these again would reintroduce the
    // defect, silently, exactly as before.
    for (const retired of ["ds:whenToUse", "ds:whenNotToUse"]) {
      const result = await rt.query.sparql(`ASK { ?s ${retired} ?o }`);
      expect(
        result.type === "ask" ? result.result : true,
        `${retired} is asserted somewhere in the shipped graph`,
      ).toBe(false);
    }
  });
});

describe("block lookup renders the usage narrative from the shipped graph (PROTECTED)", () => {
  it("renders a Usage section carrying the graph's own literal", async () => {
    const usage = await scalar(`SELECT ?u WHERE { <${BUTTON}> ds:usage ?u }`);
    expect(usage?.trim().length ?? 0).toBeGreaterThan(0);

    const llm = await renderLookup(BUTTON);
    expect(llm).toContain("### Usage");
    // The narrative itself, not just its heading: the first prose line of the
    // literal is read FROM the graph rather than retyped here, so editing the
    // content upstream cannot leave this asserting yesterday's copy.
    const firstProseLine = (usage ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) as string;
    expect(llm).toContain(firstProseLine);
  });

  it("nests the literal's own headings UNDER the Usage heading", async () => {
    // The live literals carry their own `### When to use` / `### When not to
    // use` sub-sections. Left at `###` they would be siblings of the section
    // heading, which reads as an empty Usage section; the renderer demotes them.
    const heading = await scalar(
      [
        "SELECT ?h WHERE {",
        `  <${BUTTON}> ds:usage ?u .`,
        '  BIND(REPLACE(STR(?u), "(?s)^.*?\\\\n### ([^\\\\n]+)\\\\n.*$", "$1") AS ?h)',
        "}",
      ].join("\n"),
    );
    expect(
      heading,
      "the Button usage literal carries no `### ` heading",
    ).toBeDefined();

    const llm = await renderLookup(BUTTON);
    expect(llm).toContain(`#### ${heading}`);
    expect(llm).not.toContain(`\n### ${heading}\n`);
  });

  it("prints no Usage heading for a block whose usage literal is empty", async () => {
    // Roughly half the shipped blocks assert `ds:usage ""`. An empty literal
    // must render as no section at all, never as a heading with nothing below.
    const uri = await scalar(
      [
        "SELECT ?b WHERE {",
        `  VALUES ?class { ${TYPE_VALUES} }`,
        "  ?b a ?class ; ds:usage ?u .",
        '  FILTER(STR(?u) = "")',
        "}",
        "ORDER BY ?b",
        "LIMIT 1",
      ].join("\n"),
    );
    expect(uri, "no shipped block carries an empty ds:usage").toBeDefined();

    expect(await renderLookup(uri as string)).not.toContain("### Usage");
  });
});
