import { afterEach, describe, expect, it } from "vitest";
import createTestStore from "../../testing/createTestStore.js";
import {
  COMPONENTS_TTL,
  ONTOLOGY_TTL,
  STANDARDS_TTL,
} from "../../testing/fixtures.js";
import { registerMatchers } from "../../testing/registerMatchers.js";
import type { TestStoreResult } from "../../testing/types.js";
import definePlugin from "./definePlugin.js";
import { sparql } from "./sparql.js";
import type { AskResult, ResolvedSource, SelectResult } from "./types.js";

registerMatchers();

describe("Named graphs", () => {
  let testResult: TestStoreResult | undefined;

  afterEach(() => {
    testResult?.cleanup();
    testResult = undefined;
  });

  // ---------------------------------------------------------------------------
  // Graph isolation — triples loaded into a named graph are scoped to it
  // ---------------------------------------------------------------------------

  describe("graph isolation", () => {
    it("loads triples into separate named graphs", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        prefixes: {
          ds: "https://ds.canonical.com/",
          cso: "http://pragma.canonical.com/codestandards#",
        },
      });
      const { store } = testResult;

      // Components are in their graph
      const components = await store.query(
        sparql`SELECT ?name WHERE {
          GRAPH <urn:test:components> { ?c ds:name ?name }
        } ORDER BY ?name`,
      );
      expect(components.type).toBe("select");
      expect((components as SelectResult).bindings.map((b) => b.name)).toEqual([
        "Button",
        "Card",
        "Tile",
      ]);

      // Standards are in their graph
      const standards = await store.query(
        sparql`SELECT ?name WHERE {
          GRAPH <urn:test:standards> { ?s cso:name ?name }
        } ORDER BY ?name`,
      );
      expect(standards.type).toBe("select");
      expect((standards as SelectResult).bindings.length).toBe(2);
    });

    it("components are not visible in the standards graph", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        prefixes: { ds: "https://ds.canonical.com/" },
      });
      const { store } = testResult;

      // ds:name triples should not appear in the standards graph
      const result = await store.query(
        sparql`SELECT ?name WHERE {
          GRAPH <urn:test:standards> { ?c ds:name ?name }
        }`,
      );
      expect((result as SelectResult).bindings).toHaveLength(0);
    });

    it("ontology in default graph is separate from named graphs", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [{ ttl: COMPONENTS_TTL, graph: "urn:test:components" }],
        prefixes: { ds: "https://ds.canonical.com/" },
      });
      const { store } = testResult;

      // Ontology class definitions are in the default graph, not urn:test:components
      const result = await store.query(
        sparql`ASK {
          GRAPH <urn:test:components> {
            ds:UIBlock a <http://www.w3.org/2002/07/owl#Class>
          }
        }`,
      );
      expect((result as AskResult).result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Union default — queries without GRAPH clause see all graphs
  // ---------------------------------------------------------------------------

  describe("union default (use_default_graph_as_union)", () => {
    it("queries without GRAPH clause search all graphs", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        prefixes: {
          ds: "https://ds.canonical.com/",
          cso: "http://pragma.canonical.com/codestandards#",
        },
      });
      const { store } = testResult;

      // Components from named graph are visible without GRAPH clause
      const components = await store.query(
        sparql`SELECT ?name WHERE { ?c ds:name ?name } ORDER BY ?name`,
      );
      expect((components as SelectResult).bindings.map((b) => b.name)).toEqual([
        "Button",
        "Card",
        "Tile",
      ]);

      // Standards from named graph are also visible
      const standards = await store.query(
        sparql`SELECT ?name WHERE { ?s cso:name ?name }`,
      );
      expect((standards as SelectResult).bindings.length).toBe(2);
    });

    it("ontology from default graph is visible alongside named graph data", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [{ ttl: COMPONENTS_TTL, graph: "urn:test:components" }],
        prefixes: {
          ds: "https://ds.canonical.com/",
          owl: "http://www.w3.org/2002/07/owl#",
        },
      });
      const { store } = testResult;

      // Can query ontology (default graph) and instances (named graph) together
      const result = await store.query(
        sparql`SELECT ?name WHERE {
          ?c a ds:Component ;
             ds:name ?name
        } ORDER BY ?name`,
      );
      expect((result as SelectResult).bindings.map((b) => b.name)).toEqual([
        "Button",
        "Card",
        "Tile",
      ]);
    });

    it("ASK queries work across graphs without GRAPH clause", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [{ ttl: COMPONENTS_TTL, graph: "urn:test:components" }],
        prefixes: { ds: "https://ds.canonical.com/" },
      });
      const { store } = testResult;

      const result = await store.query(sparql`ASK { ?c ds:name "Button" }`);
      expect((result as AskResult).result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GRAPH clause scoping — explicit graph selection in queries
  // ---------------------------------------------------------------------------

  describe("GRAPH clause scoping", () => {
    it("GRAPH clause restricts results to the named graph", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        prefixes: { ds: "https://ds.canonical.com/" },
      });
      const { store } = testResult;

      // Only components graph — should find ds:name triples
      const result = await store.query(
        sparql`SELECT ?name WHERE {
          GRAPH <urn:test:components> { ?c ds:name ?name }
        } ORDER BY ?name`,
      );
      const names = (result as SelectResult).bindings.map((b) => b.name);
      expect(names).toEqual(["Button", "Card", "Tile"]);
    });

    it("cross-graph join via multiple GRAPH clauses", async () => {
      // Load components and standards that reference the same URIs
      const componentsWithStandard = `
        @prefix ds: <https://ds.canonical.com/> .
        @prefix cso: <http://pragma.canonical.com/codestandards#> .

        ds:button a ds:Component ;
          ds:name "Button" ;
          ds:followsStandard cso:react-props .
      `;

      const standardsDef = `
        @prefix cso: <http://pragma.canonical.com/codestandards#> .

        cso:react-props a cso:CodeStandard ;
          cso:name "react/component/props" ;
          cso:description "Props must extend the base HTML element type" .
      `;

      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: componentsWithStandard, graph: "urn:test:components" },
          { ttl: standardsDef, graph: "urn:test:standards" },
        ],
        prefixes: {
          ds: "https://ds.canonical.com/",
          cso: "http://pragma.canonical.com/codestandards#",
        },
      });
      const { store } = testResult;

      // Join across two named graphs
      const result = await store.query(
        sparql`SELECT ?componentName ?standardName WHERE {
          GRAPH <urn:test:components> {
            ?c ds:name ?componentName ;
               ds:followsStandard ?std
          }
          GRAPH <urn:test:standards> {
            ?std cso:name ?standardName
          }
        }`,
      );

      const bindings = (result as SelectResult).bindings;
      expect(bindings).toHaveLength(1);
      expect(bindings[0].componentName).toBe("Button");
      expect(bindings[0].standardName).toBe("react/component/props");
    });

    it("CONSTRUCT with GRAPH clause returns scoped triples", async () => {
      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        prefixes: { ds: "https://ds.canonical.com/" },
      });
      const { store } = testResult;

      const result = await store.query(
        sparql`CONSTRUCT { ?c ds:name ?name }
          WHERE {
            GRAPH <urn:test:components> { ?c ds:name ?name }
          }`,
      );
      expect(result.type).toBe("construct");
      expect(result.triples.length).toBe(3);
      expect(result).toContainTriple({
        predicate: "https://ds.canonical.com/name",
        object: "Button",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Plugin onLoad receives graph info
  // ---------------------------------------------------------------------------

  describe("plugin onLoad receives graph info", () => {
    it("onLoad source includes graph URI when assigned", async () => {
      const loadedSources: ResolvedSource[] = [];
      const plugin = definePlugin({
        name: "graph-tracker",
        onLoad(source) {
          loadedSources.push(source);
        },
      });

      testResult = await createTestStore({
        ttl: ONTOLOGY_TTL,
        graphs: [
          { ttl: COMPONENTS_TTL, graph: "urn:test:components" },
          { ttl: STANDARDS_TTL, graph: "urn:test:standards" },
        ],
        plugins: [plugin],
      });

      // 3 sources total: ontology (default), components (named), standards (named)
      expect(loadedSources).toHaveLength(3);

      // Default graph source has no graph property
      expect(loadedSources[0].graph).toBeUndefined();

      // Named graph sources carry their graph URI
      expect(loadedSources[1].graph).toBe("urn:test:components");
      expect(loadedSources[2].graph).toBe("urn:test:standards");
    });
  });
});
