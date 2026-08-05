/**
 * Block content-parity (PROTECTED) — the `block` story `pragma.conf.ts`
 * declares, over a fixture graph rather than the live one.
 *
 * The block noun is entirely declared now, so parity is asserted against the
 * graph directly: Button and Modal resolve through the GraphQL `block lookup`
 * with the same content a direct SPARQL oracle returns (summary, guidance,
 * anatomy, tier, modifier families with values, properties, subcomponents). The
 * fixture DECLARES whenToUse/whenNotToUse (which the live graph superseded with
 * ds:usage), so those sections are exercised here.
 *
 * The `list` half pins the OPPOSITE of what it used to. The hand-written verb
 * narrowed rows by the configured tier chain and by channel; the declared one
 * cannot, so the cases below assert that every block is listed — untiered ones
 * included — and that the row shape the renderer wants (display words in
 * `type`/`tier`, not compacted IRIs) survives the move into SPARQL.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePack } from "../kernel/packs/compile.js";
import type { LookupOutput } from "../kernel/packs/resolveEntity.js";
import type { PackRow } from "../kernel/packs/types.js";
import { distributionOrigin } from "../kernel/packs/types.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { BLOCK_PREFIXES, BLOCK_TTL } from "../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { declaredStories } from "./distribution.js";

const DS = "https://ds.canonical.com/";

const blockPack = declaredStories.get("block");
if (!blockPack) {
  throw new Error('pragma.conf.ts declares no story for "block"');
}

const compiled = compilePack(
  blockPack,
  distributionOrigin("pragma.conf.ts"),
  DEFAULT_PREFIX_MAP,
);
/** Resolve one compiled verb by key, or fail naming the key that is missing. */
function findCompiledVerb(key: string): VerbSpec {
  const verb = compiled.find((candidate) => verbKey(candidate.path) === key);
  if (!verb) {
    throw new Error(`the "block" story compiles no \`${key}\` verb`);
  }
  return verb;
}

const listVerb = findCompiledVerb("block list");
const lookupVerb = findCompiledVerb("block lookup");

let rt: PragmaRuntime;

beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
    detail: "detailed",
  }));
});

afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/**
 * The single result of a `block lookup`, or a throw naming the block.
 *
 * `.at(0)` is `T | undefined` for a reason: a lookup that resolved nothing
 * returns an empty `results`. Casting that away sent `undefined` into every
 * assertion below, where it surfaced as a TypeError on a property read instead
 * of naming the block that did not resolve.
 *
 * @param name - The block name to look up.
 * @returns The one result row.
 * @note Impure — runs the compiled verb against the shared fixture runtime.
 */
async function lookupOneBlock(name: string): Promise<Record<string, unknown>> {
  const out = (await lookupVerb.run({ name: [name] }, rt)) as LookupOutput;
  expect(out.errors).toEqual([]);
  const first = out.results.at(0);
  if (!first) {
    throw new Error(`block lookup returned no result for "${name}"`);
  }
  return first as Record<string, unknown>;
}

/**
 * Read one scalar straight from the graph — the oracle the compiled verb's
 * output is checked against.
 *
 * The `?? ""` this carried was a way for the oracle to AGREE with a verb that
 * read nothing: a non-SELECT result and an unbound predicate both collapsed to
 * the empty string, so a compiled verb that had stopped projecting the property
 * could have matched the oracle. Both now throw naming subject and predicate.
 *
 * @param subject - Absolute IRI of the subject to read.
 * @param predicate - Prefixed name of the property to read.
 * @returns The single bound value.
 * @note Impure — queries the shared fixture runtime.
 */
async function readOneValue(
  subject: string,
  predicate: string,
): Promise<string> {
  const result = await rt.query.sparql(
    `SELECT ?v WHERE { <${subject}> ${predicate} ?v }`,
  );
  if (result.type !== "select") {
    throw new Error(
      `oracle for <${subject}> ${predicate} returned a ${result.type} result, not a SELECT`,
    );
  }
  const value = result.bindings.at(0)?.v;
  if (value === undefined) {
    throw new Error(`the graph binds no ${predicate} on <${subject}>`);
  }
  return value;
}

describe("block lookup — Button content parity (GraphQL, detailed)", () => {
  it("resolves the full Button spec with content matching the SPARQL oracle", async () => {
    const button = await lookupOneBlock("Button");
    expect(button.uri).toBe(`${DS}button`);
    expect(button.name).toBe("Button");
    expect(button.tier).toBe(`${DS}global`);

    // Guidance + anatomy sections — each cross-checked against the graph.
    expect(button.summary).toBe(await readOneValue(`${DS}button`, "ds:summary"));
    expect(button.whenToUse).toBe(await readOneValue(`${DS}button`, "ds:whenToUse"));
    expect(button.whenNotToUse).toBe(
      await readOneValue(`${DS}button`, "ds:whenNotToUse"),
    );
    expect(button.guidelines).toBe(
      await readOneValue(`${DS}button`, "ds:guidelines"),
    );
    expect(button.anatomyDsl).toBe(
      await readOneValue(`${DS}button`, "ds:anatomyDsl"),
    );
    expect(button.figmaLink).toBe(await readOneValue(`${DS}button`, "ds:figmaLink"));
  });

  it("resolves the nested modifier families with values (inverse union)", async () => {
    const button = await lookupOneBlock("Button");
    const families = button.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name).sort()).toEqual([
      "density",
      "importance",
    ]);
    const importance = families.find((f) => f.name === "importance");
    expect(importance?.values?.sort()).toEqual(["primary", "secondary"]);
  });

  it("resolves properties and the subtype-scoped subcomponents identity field", async () => {
    const button = await lookupOneBlock("Button");
    expect(button.properties).toEqual([
      { name: "disabled", type: "boolean", optional: "true" },
    ]);
    expect(button.subcomponents).toEqual([
      { name: "Button Icon", uri: `${DS}button.icon` },
    ]);
  });

  it("renders every declared section in the llm output", async () => {
    const out = (await lookupVerb.run(
      { name: ["Button"] },
      rt,
    )) as LookupOutput;
    const llm = lookupVerb.output.formatters.llm(out);
    expect(llm).toContain("## Button");
    expect(llm).toContain("### When to use");
    expect(llm).toContain("### Anatomy (DSL)");
    expect(llm).toContain("### Modifier Families");
    expect(llm).toContain("primary");
  });
});

describe("block lookup — Modal content parity (GraphQL, detailed)", () => {
  it("resolves the full Modal spec (a different block, same document engine)", async () => {
    const modal = await lookupOneBlock("Modal");
    expect(modal.uri).toBe(`${DS}modal`);
    expect(modal.name).toBe("Modal");
    expect(modal.summary).toBe(await readOneValue(`${DS}modal`, "ds:summary"));
    expect(modal.whenToUse).toBe(await readOneValue(`${DS}modal`, "ds:whenToUse"));
    const families = modal.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name)).toEqual(["size"]);
    expect(families.at(0)?.values?.sort()).toEqual(["large", "small"]);
    expect(modal.properties).toEqual([
      { name: "open", type: "boolean", optional: "false" },
    ]);
    // Modal has no subcomponents — the subtype-scoped selection is simply absent.
    expect(modal.subcomponents).toEqual([]);
  });
});

describe("block lookup — disclosure trims to the base view at summary", () => {
  it("summary keeps name/tier/summary and drops the detailed sections/expands", async () => {
    const out = (await lookupVerb.run(
      { name: ["Button"] },
      { ...rt, globalFlags: { ...rt.globalFlags, detail: "summary" } },
    )) as LookupOutput;
    const button = out.results.at(0);
    if (!button) {
      throw new Error('block lookup returned no result for "Button"');
    }
    expect(button.name).toBe("Button");
    expect(button.summary).toBeDefined();
    expect(button.whenToUse).toBeUndefined();
    expect(button.anatomyDsl).toBeUndefined();
    expect(button.modifierFamilies).toBeUndefined();
    expect(button.figmaLink).toBeUndefined();
  });
});

describe("block list — unfiltered, with the row shape the renderer wants", () => {
  it("lists EVERY block, the untiered subcomponent included", async () => {
    // Button Icon is a ds:Subcomponent carrying no ds:tier. The hand-written
    // verb joined through the tier and dropped it unless `--all-tiers` was
    // passed; the declared query rides ds:tier on an OPTIONAL, so there is no
    // view in which it is hidden and no flag left to pass.
    const rows = (await listVerb.run({}, rt)) as PackRow[];
    expect(rows.map((row) => row.name).sort()).toEqual([
      "Button",
      "Button Icon",
      "Modal",
    ]);
  });

  it("keeps type and tier as display words, not compacted IRIs", async () => {
    // The local-name extraction moved from a TypeScript post-pass into the
    // query (`REPLACE(STR(?x), "^.*[/#]", "")`). Without it these columns would
    // render `ds:Component` / `ds:global`, which is the one visible thing the
    // move could have broken silently.
    const rows = (await listVerb.run({}, rt)) as PackRow[];
    const button = rows.find((row) => row.name === "Button");
    expect(button?.type).toBe("component");
    expect(button?.tier).toBe("global");
    expect(button?.uri).toBe(`${DS}button`);
    // GROUP_CONCAT of the family names (order-independent).
    expect(button?.modifiers?.split(", ").sort()).toEqual([
      "density",
      "importance",
    ]);
    // Both aggregate/OPTIONAL columns show a CELL on the block that binds
    // neither, empty rather than absent — the COALESCE is what keeps them
    // addressable for every row. `modifiers` is asserted alongside `tier`
    // because it shipped unguarded and unwrapped once: a consumer doing
    // `row.modifiers.split(", ")` threw on every block with no modifier family.
    const buttonIcon = rows.find((row) => row.name === "Button Icon");
    if (!buttonIcon) {
      throw new Error('`block list` returned no row named "Button Icon"');
    }
    expect(buttonIcon.tier).toBe("");
    expect(buttonIcon.modifiers).toBe("");
    expect(Object.keys(buttonIcon).sort()).toEqual([
      "modifiers",
      "name",
      "tier",
      "type",
      "uri",
    ]);
  });

  it("takes no flags — there is nothing left to widen", () => {
    expect(listVerb.params).toEqual([]);
  });
});
