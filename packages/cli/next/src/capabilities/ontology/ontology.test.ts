/**
 * Ontology inspection (list + show) over the block fixture graph.
 *
 * Asserts the TBox exception: namespaces are grouped with class/property counts,
 * a namespace's class hierarchy carries per-class instance counts from the pack
 * index, `--class` focuses, `--properties` includes properties, and `--full-uris`
 * shows absolute IRIs.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { ontologyModule } from "./index.js";
import type { OntologyShowData, OntologySummary } from "./queries.js";

const listVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology list",
) as VerbSpec;
const showVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology show",
) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
  }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("ontology list", () => {
  it("groups the ds namespace with class and property counts", async () => {
    const rows = (await listVerb.run({}, rt)) as OntologySummary[];
    const ds = rows.find((r) => r.prefix === "ds");
    expect(ds).toBeDefined();
    expect(ds?.namespace).toBe("https://ds.canonical.com/");
    expect(ds?.classCount).toBeGreaterThan(0);
    expect(ds?.propertyCount).toBeGreaterThan(0);
  });
});

describe("ontology show", () => {
  it("renders the class hierarchy with per-class instance counts from the index", async () => {
    const data = (await showVerb.run({ prefix: "ds" }, rt)) as OntologyShowData;
    const component = data.classes.find((c) => c.uri.endsWith("Component"));
    expect(component?.superclass).toBe("https://ds.canonical.com/UIBlock");
    // Two Component individuals (Button, Modal) in the fixture.
    expect(component?.instanceCount).toBe(2);
    expect(data.properties).toEqual([]);
  });

  it("--class focuses on one class and its properties", async () => {
    const data = (await showVerb.run(
      { prefix: "ds", class: "BlockProperty" },
      rt,
    )) as OntologyShowData;
    expect(data.classes.map((c) => c.uri.split(/[#/]/).pop())).toEqual([
      "BlockProperty",
    ]);
    // The focus pulls in properties whose domain is BlockProperty.
    expect(
      data.properties.every(
        (p) => p.domain === "https://ds.canonical.com/BlockProperty",
      ),
    ).toBe(true);
    expect(data.properties.length).toBeGreaterThan(0);
    expect(data.focus).toBe("BlockProperty");
  });

  it("--full-uris flag rides on the payload for the renderer", async () => {
    const data = (await showVerb.run(
      { prefix: "ds", fullUris: true },
      rt,
    )) as OntologyShowData;
    expect(data.fullUris).toBe(true);
    const llm = showVerb.output.formatters.llm(data);
    expect(llm).toContain("https://ds.canonical.com/Component");
  });

  it("rejects an unknown prefix with recovery", async () => {
    await expect(showVerb.run({ prefix: "nope" }, rt)).rejects.toThrow(
      /prefix/i,
    );
  });
});
