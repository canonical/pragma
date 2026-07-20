import { createStore } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  OWL_EXPORT_ABOX_SUBJECTS,
  OWL_EXPORT_PREFIXES,
  OWL_EXPORT_TTL,
} from "../../../testing/fixtures/graph/owlExport.js";
import { entityTotal } from "../../completion/entitySource.js";
import { buildIndex } from "./buildIndex.js";
import type { PackIndex } from "./types.js";

type Store = import("@canonical/ke").Store;

/**
 * The counters/classifiers `buildIndex` builds are masked by the embedded
 * single-typed toy graph; the multi-typed OWL-export fixture is where the
 * backlog-A bugs bite. Each `it` fails on the pre-fix code and passes after.
 */
describe("buildIndex — real-data counters/classifiers (backlog A)", () => {
  let store: Store;
  let index: PackIndex;

  beforeAll(async () => {
    store = await createStore({
      sources: [{ content: OWL_EXPORT_TTL, path: "owl-export.ttl" }],
      prefixes: OWL_EXPORT_PREFIXES,
    });
    index = await buildIndex(store, OWL_EXPORT_PREFIXES, "test-hash");
  });

  afterAll(() => {
    store.dispose();
  });

  const byName = (name: string): PackIndex["entities"][number][] =>
    index.entities.filter((entity) => entity.name === name);

  it("A1: entityTotal counts DISTINCT abox subjects, not the raw multiset", () => {
    // Every individual once — despite Protégé's `owl:NamedIndividual` dual-typing.
    expect(entityTotal(index)).toBe(OWL_EXPORT_ABOX_SUBJECTS.length);

    // The raw multiset the old code summed is strictly larger: each individual
    // double-counts under `owl:NamedIndividual`, plus the class/property
    // meta-buckets pile on top.
    const rawSum = Object.values(index.instanceCountByType).reduce(
      (sum, n) => sum + n,
      0,
    );
    expect(rawSum).toBeGreaterThan(entityTotal(index));

    // The abox names match the oracle exactly.
    const aboxNames = index.entities
      .filter((entity) => entity.box === "abox")
      .map((entity) => entity.name);
    expect([...new Set(aboxNames)].sort()).toEqual([
      ...OWL_EXPORT_ABOX_SUBJECTS,
    ]);
  });

  it("A3: a multi-domain individual gets a deterministic (lexical) primary type", () => {
    // ex:toggle is both ex:Interactive and ex:FormControl; the smaller wins,
    // every build/engine — never whichever type the store returned first.
    const toggle = byName("ex:toggle").at(0);
    expect(toggle?.type).toBe("ex:FormControl");
    expect(toggle?.box).toBe("abox");
  });

  it("A6: a blank-node rdf:type is ignored, never a garbage primary type", () => {
    // ex:field is typed by an anonymous class too; the blank node must not win.
    expect(byName("ex:field").at(0)?.type).toBe("ex:FormControl");
    // No entity type, no listed type, and no instance-count bucket is a blank node.
    for (const entity of index.entities) {
      expect(entity.type.startsWith("_:")).toBe(false);
      for (const type of entity.types ?? []) {
        expect(type.startsWith("_:")).toBe(false);
      }
    }
    for (const key of Object.keys(index.instanceCountByType)) {
      expect(key.startsWith("_:")).toBe(false);
    }
  });

  it("A7: a multilingual label resolves to @en, deterministically", () => {
    // "Button"@en / "Bouton"@fr → Button; the @lang no longer flips the pick.
    expect(byName("ds:button").at(0)?.label).toBe("Button");
    expect(byName("ex:toggle").at(0)?.label).toBe("Toggle");
    expect(byName("ds:datePicker").at(0)?.label).toBe("Date Picker");
  });

  it("A8: an OWL-punned subject emits BOTH its tbox and abox facet", () => {
    // ex:Slider is a class (tbox) AND an ex:Category individual (abox) — both
    // must survive, so its abox membership stays completable.
    const facets = byName("ex:Slider");
    expect(facets).toHaveLength(2);
    expect(facets.map((facet) => facet.box).sort()).toEqual(["abox", "tbox"]);
    expect(facets.find((facet) => facet.box === "tbox")?.type).toBe(
      "owl:Class",
    );
    expect(facets.find((facet) => facet.box === "abox")?.type).toBe(
      "ex:Category",
    );
  });
});
