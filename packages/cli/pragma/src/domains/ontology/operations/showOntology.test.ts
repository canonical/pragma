import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../shared/prefixes.js";
import showOntology from "./showOntology.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

describe("showOntology", () => {
  it("returns classes with attached properties for a prefix", async () => {
    const result = await showOntology(store, "ds");
    expect(result.prefix).toBe("ds");
    expect(result.namespace).toBe(DEFAULT_PREFIX_MAP.ds);
    expect(result.classes.length).toBeGreaterThan(0);

    const uiBlock = result.classes.find((c) => c.iri === "ds:UIBlock");
    expect(uiBlock).toBeDefined();
    expect(uiBlock?.properties.map((p) => p.label)).toContain("name");
  });

  it("preserves all subClassOf edges as compact IRIs", async () => {
    const result = await showOntology(store, "ds");
    const component = result.classes.find((c) => c.label === "Component");
    expect(component).toBeDefined();
    expect(component?.subClassOf).toContain("ds:UIBlock");
  });

  it("orders classes topologically (parents before children)", async () => {
    const result = await showOntology(store, "ds");
    const order = result.classes.map((c) => c.iri);
    expect(order.indexOf("ds:UIBlock")).toBeLessThan(
      order.indexOf("ds:Component"),
    );
  });

  it("includes rdfs:comment when declared", async () => {
    const result = await showOntology(store, "ds");
    const component = result.classes.find((c) => c.iri === "ds:Component");
    expect(component?.comment).toBe("A reusable UI building block.");
  });

  it("counts instances per class", async () => {
    const result = await showOntology(store, "ds");
    const component = result.classes.find((c) => c.iri === "ds:Component");
    expect(component?.instances).toBeGreaterThan(0);
  });

  it("marks functional properties", async () => {
    const result = await showOntology(store, "ds");
    const uiBlock = result.classes.find((c) => c.iri === "ds:UIBlock");
    const tier = uiBlock?.properties.find((p) => p.iri === "ds:tier");
    expect(tier?.functional).toBe(true);
  });

  it("attaches property domain and range as compact IRIs", async () => {
    const result = await showOntology(store, "ds");
    const uiBlock = result.classes.find((c) => c.iri === "ds:UIBlock");
    const nameProp = uiBlock?.properties.find((p) => p.iri === "ds:name");
    expect(nameProp).toBeDefined();
    expect(nameProp?.domain).toBe("ds:UIBlock");
    expect(nameProp?.kind).toBe("datatype");
    expect(nameProp?.range).toBe("xsd:string");
  });

  it("emits a prefixes map covering the compact IRIs used", async () => {
    const result = await showOntology(store, "ds");
    expect(result.prefixes.ds).toBe(DEFAULT_PREFIX_MAP.ds);
    expect(result.prefixes.xsd).toBeDefined();
  });

  it("surfaces the owl:Ontology header", async () => {
    const result = await showOntology(store, "ds");
    expect(result.meta?.title).toBe("Design System Ontology");
    expect(result.meta?.version).toBe("0.1.0-test");
  });

  it("summarizes SHACL node shapes", async () => {
    const result = await showOntology(store, "ds");
    const shape = result.constraints?.find(
      (c) => c.shape === "ds:ComponentShape",
    );
    expect(shape).toBeDefined();
    expect(shape?.targetClass).toBe("ds:Component");
    expect(shape?.propertyCount).toBe(2);
  });

  it("resolves full namespace URI", async () => {
    const result = await showOntology(store, DEFAULT_PREFIX_MAP.ds);
    expect(result.prefix).toBe("ds");
    expect(result.classes.length).toBeGreaterThan(0);
  });

  it("throws PragmaError.invalidInput for unknown prefix", async () => {
    await expect(showOntology(store, "unknown")).rejects.toThrow(PragmaError);

    try {
      await showOntology(store, "unknown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("returns cs ontology with standard classes", async () => {
    const result = await showOntology(store, "cs");
    expect(result.prefix).toBe("cs");
    const standard = result.classes.find((c) => c.iri.includes("CodeStandard"));
    expect(standard).toBeDefined();
  });
});

describe("showOntology — class focus", () => {
  it("deep-dives into a class by label", async () => {
    const result = await showOntology(store, "ds", { class: "Component" });
    const focus = result.focus;
    expect(focus).toBeDefined();
    expect(focus?.iri).toBe("ds:Component");
    expect(focus?.superChain).toEqual(["ds:UIBlock"]);
    expect(focus?.instances).toBeGreaterThan(0);
  });

  it("separates direct and inherited properties", async () => {
    const result = await showOntology(store, "ds", { class: "Component" });
    const inherited = result.focus?.inheritedProperties.map((p) => p.iri);
    expect(inherited).toContain("ds:name");
  });

  it("finds reverse references (properties ranging over the class)", async () => {
    const result = await showOntology(store, "ds", { class: "UIBlock" });
    const refs = result.focus?.referencedBy.map((p) => p.iri);
    expect(refs).toContain("ds:implementsBlock");
  });

  it("returns sample instance IRIs", async () => {
    const result = await showOntology(store, "ds", { class: "Component" });
    expect(result.focus?.sampleInstances.length).toBeGreaterThan(0);
  });

  it("accepts a compact IRI and a local name", async () => {
    const byIri = await showOntology(store, "ds", { class: "ds:Component" });
    expect(byIri.focus?.iri).toBe("ds:Component");

    const byLocal = await showOntology(store, "ds", { class: "component" });
    expect(byLocal.focus?.iri).toBe("ds:Component");
  });

  it("throws not-found with suggestions for an unknown class", async () => {
    try {
      await showOntology(store, "ds", { class: "Comp" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
      expect((e as PragmaError).suggestions).toContain("Component");
    }
  });

  it("still returns the full namespace structure alongside the focus", async () => {
    const result = await showOntology(store, "ds", { class: "Component" });
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.focus).toBeDefined();
  });
});
