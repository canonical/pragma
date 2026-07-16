import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_ORIGINS } from "#config";
import { createTestMcpClient, createTestStore } from "#testing";
import { DEFAULT_PREFIX_MAP, P } from "../domains/shared/prefixes.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import createClientFromRuntime from "../testing/helpers/createTestMcpClient.js";
import {
  ABOX_PER_CLASS_LIMIT,
  COMPLETION_LIMIT,
} from "./resources/constants.js";

let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const result = await createTestMcpClient();
  client = result.client;
  cleanup = result.cleanup;
});

afterAll(async () => {
  await cleanup();
});

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

interface ListedMeta {
  "pragma/box"?: string;
  "pragma/category"?: string;
  "pragma/type"?: string | null;
  "pragma/instanceCount"?: number;
  "pragma/instancesShown"?: number;
  "pragma/truncated"?: boolean;
}

function parseContents(result: { contents: unknown[] }): unknown {
  const first = result.contents.at(0) as ResourceContent;
  return JSON.parse(first.text);
}

function metaOf(resource: { _meta?: unknown }): ListedMeta {
  return (resource._meta ?? {}) as ListedMeta;
}

/**
 * Build an MCP client over a store with the given TTL and extra prefixes.
 * Lets foreign/overlapping namespaces be registered, which the shared
 * `createTestMcpClient` (fixed prefix set) cannot express.
 */
async function createClientForTtl(
  ttl: string,
  prefixes?: Record<string, string>,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const { store, cleanup: closeStore } = await createTestStore({
    ttl,
    prefixes,
  });
  const runtime: PragmaRuntime = {
    store,
    config: { tier: undefined, channel: "normal" },
    origins: DEFAULT_ORIGINS,
    cwd: process.cwd(),
    packages: [],
    dispose: () => closeStore(),
  };
  const { client: scopedClient, cleanup: closeClient } =
    await createClientFromRuntime(runtime);
  return {
    client: scopedClient,
    cleanup: async () => {
      await closeClient();
      runtime.dispose();
    },
  };
}

// =============================================================================
// Resource template
// =============================================================================

describe("resource template", () => {
  it("registers 1 resource template with the {+uri} pattern", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates).toHaveLength(1);
    expect(resourceTemplates.at(0)?.uriTemplate).toBe("{+uri}");
  });

  it("documents the TBox/ABox split in the template description", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.at(0)?.description).toMatch(/TBox/);
  });
});

// =============================================================================
// Resource listing — presence
// =============================================================================

describe("resource listing — presence", () => {
  it("lists known instances, OWL classes, and code standards", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(`${P.ds}global.component.button`);
    expect(uris).toContain(`${P.ds}global`);
    expect(uris).toContain(`${P.ds}UIBlock`);
    expect(uris).toContain(`${P.ds}Component`);
    expect(uris).toContain(`${P.cs}react_folder`);
    expect(uris).toContain(`${P.cs}code_purity`);
  });
});

// =============================================================================
// Resource listing — TBox/ABox separation
// =============================================================================

describe("resource listing — TBox/ABox separation", () => {
  it("tags classes as tbox/class in _meta", async () => {
    const { resources } = await client.listResources();
    const uiBlock = resources.find((r) => r.uri === `${P.ds}UIBlock`);
    expect(metaOf(uiBlock ?? {})["pragma/box"]).toBe("tbox");
    expect(metaOf(uiBlock ?? {})["pragma/category"]).toBe("class");
  });

  it("tags properties as tbox/property in _meta", async () => {
    const { resources } = await client.listResources();
    const tier = resources.find((r) => r.uri === `${P.ds}tier`);
    expect(metaOf(tier ?? {})["pragma/box"]).toBe("tbox");
    expect(metaOf(tier ?? {})["pragma/category"]).toBe("property");
  });

  it("tags individuals as abox/individual with their class in _meta", async () => {
    const { resources } = await client.listResources();
    const button = resources.find(
      (r) => r.uri === `${P.ds}global.component.button`,
    );
    expect(metaOf(button ?? {})["pragma/box"]).toBe("abox");
    expect(metaOf(button ?? {})["pragma/category"]).toBe("individual");
    expect(metaOf(button ?? {})["pragma/type"]).toBe(`${P.ds}Component`);
  });

  it("places all TBox schema before any ABox individual", async () => {
    const { resources } = await client.listResources();
    const firstAbox = resources.findIndex(
      (r) => metaOf(r)["pragma/box"] === "abox",
    );
    const lastTbox = resources.reduce(
      (acc, r, i) => (metaOf(r)["pragma/box"] === "tbox" ? i : acc),
      -1,
    );
    expect(firstAbox).toBeGreaterThan(-1);
    expect(lastTbox).toBeGreaterThan(-1);
    expect(lastTbox).toBeLessThan(firstAbox);
  });

  it("ranks schema above individuals via annotation priority", async () => {
    const { resources } = await client.listResources();
    const cls = resources.find((r) => r.uri === `${P.ds}Component`);
    const individual = resources.find(
      (r) => r.uri === `${P.ds}global.component.button`,
    );
    const clsPriority = cls?.annotations?.priority ?? 0;
    const individualPriority = individual?.annotations?.priority ?? 1;
    expect(clsPriority).toBeGreaterThan(individualPriority);
  });
});

// =============================================================================
// Resource listing — names, descriptions, grouping
// =============================================================================

describe("resource listing — names and grouping", () => {
  it("prefixes class names with their category", async () => {
    const { resources } = await client.listResources();
    const cls = resources.find((r) => r.uri === `${P.ds}Component`);
    expect(cls?.name).toBe("Class · Component");
  });

  it("prefixes property names with their category", async () => {
    const { resources } = await client.listResources();
    const prop = resources.find((r) => r.uri === `${P.ds}tier`);
    expect(prop?.name).toBe("Property · tier");
  });

  it("groups individuals under their class label in the name", async () => {
    const { resources } = await client.listResources();
    const button = resources.find(
      (r) => r.uri === `${P.ds}global.component.button`,
    );
    expect(button?.name).toBe("Component · Button");
  });

  it("surfaces instance counts on class entries", async () => {
    const { resources } = await client.listResources();
    const cls = resources.find((r) => r.uri === `${P.ds}Component`);
    expect(metaOf(cls ?? {})["pragma/instanceCount"]).toBe(4);
    expect(metaOf(cls ?? {})["pragma/truncated"]).toBe(false);
    expect(cls?.description).toMatch(/4 individuals/);
  });

  it("leads an individual description with its class label", async () => {
    const { resources } = await client.listResources();
    const button = resources.find(
      (r) => r.uri === `${P.ds}global.component.button`,
    );
    expect(button?.description).toMatch(/^Component/);
  });

  it("marks resources with assistant audience", async () => {
    const { resources } = await client.listResources();
    const button = resources.find(
      (r) => r.uri === `${P.ds}global.component.button`,
    );
    expect(button?.annotations?.audience).toEqual(["assistant"]);
  });
});

// =============================================================================
// Resource listing — capping the ABox long tail
// =============================================================================

describe("resource listing — capping", () => {
  it("caps individuals per class and reports the remainder", async () => {
    const overflow = ABOX_PER_CLASS_LIMIT + 5;
    const individuals = Array.from(
      { length: overflow },
      (_, i) => `ds:widget_${i} a ds:Gadget ; ds:name "Widget ${i}" .`,
    ).join("\n");
    const ttl = `@prefix ds: <${DEFAULT_PREFIX_MAP.ds}> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ds:Gadget a owl:Class ; rdfs:label "Gadget" .
ds:name a owl:DatatypeProperty .

${individuals}
`;
    const scoped = await createClientForTtl(ttl);
    try {
      const { resources } = await scoped.client.listResources();
      const shown = resources.filter(
        (r) => metaOf(r)["pragma/type"] === `${P.ds}Gadget`,
      );
      expect(shown).toHaveLength(ABOX_PER_CLASS_LIMIT);

      const cls = resources.find((r) => r.uri === `${P.ds}Gadget`);
      expect(metaOf(cls ?? {})["pragma/instanceCount"]).toBe(overflow);
      expect(metaOf(cls ?? {})["pragma/instancesShown"]).toBe(
        ABOX_PER_CLASS_LIMIT,
      );
      expect(metaOf(cls ?? {})["pragma/truncated"]).toBe(true);
      expect(cls?.description).toMatch(
        new RegExp(`showing ${ABOX_PER_CLASS_LIMIT} of ${overflow}`),
      );
    } finally {
      await scoped.cleanup();
    }
  });
});

// =============================================================================
// Resource listing — foreign namespace label fallback
// =============================================================================

describe("resource listing — foreign namespace label fallback", () => {
  const ttl = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix schema: <http://schema.org/> .
@prefix ex: <http://foreign.example/> .

ex:Widget a owl:Class ; skos:prefLabel "Foreign Widget" .
ex:gadget a ex:Widget ; dcterms:title "Shiny Gadget" .
ex:thing a ex:Widget ; schema:name "Plain Thing" .
`;

  it("resolves a foreign class name via skos:prefLabel", async () => {
    const scoped = await createClientForTtl(ttl, {
      ex: "http://foreign.example/",
    });
    try {
      const { resources } = await scoped.client.listResources();
      const cls = resources.find((r) => r.uri === "ex:Widget");
      expect(cls?.name).toBe("Class · Foreign Widget");
    } finally {
      await scoped.cleanup();
    }
  });

  it("resolves foreign individual names via dcterms:title and schema:name", async () => {
    const scoped = await createClientForTtl(ttl, {
      ex: "http://foreign.example/",
    });
    try {
      const { resources } = await scoped.client.listResources();
      const gadget = resources.find((r) => r.uri === "ex:gadget");
      const thing = resources.find((r) => r.uri === "ex:thing");
      expect(gadget?.name).toBe("Foreign Widget · Shiny Gadget");
      expect(thing?.name).toBe("Foreign Widget · Plain Thing");
    } finally {
      await scoped.cleanup();
    }
  });
});

// =============================================================================
// Resource listing — longest-namespace prefix resolution
// =============================================================================

describe("resource listing — longest-namespace prefix resolution", () => {
  it("compacts with the longest matching namespace", async () => {
    const ttl = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix base: <http://ex.org/> .
@prefix sub: <http://ex.org/sub/> .

base:Thing a owl:Class ; rdfs:label "Thing" .
sub:Widget a owl:Class ; rdfs:label "Widget" .
`;
    // `base` is registered before `sub`; first-match compaction would
    // mis-compact to "base:sub/Widget".
    const scoped = await createClientForTtl(ttl, {
      base: "http://ex.org/",
      sub: "http://ex.org/sub/",
    });
    try {
      const { resources } = await scoped.client.listResources();
      const uris = resources.map((r) => r.uri);
      expect(uris).toContain("sub:Widget");
      expect(uris).not.toContain("base:sub/Widget");
    } finally {
      await scoped.cleanup();
    }
  });
});

// =============================================================================
// Autocomplete
// =============================================================================

async function completeUri(value: string): Promise<{
  values: string[];
  total?: number;
}> {
  const result = await client.complete({
    ref: { type: "ref/resource", uri: "{+uri}" },
    argument: { name: "uri", value },
  });
  return result.completion;
}

describe("autocomplete", () => {
  it("matches a URI substring, not just a prefix", async () => {
    const { values } = await completeUri("button");
    expect(values).toContain(`${P.ds}global.component.button`);
  });

  it("matches a human label fragment", async () => {
    const { values } = await completeUri("Card");
    expect(values).toContain(`${P.ds}global.component.card`);
  });

  it("returns compacted URIs, not full URIs", async () => {
    const { values } = await completeUri("button");
    expect(values.every((v) => !v.startsWith("http"))).toBe(true);
  });

  it("ranks an exact label match above a substring match", async () => {
    const { values } = await completeUri("component");
    const exactIdx = values.indexOf(`${P.ds}Component`);
    const substringIdx = values.indexOf(`${P.ds}global.component.button`);
    expect(exactIdx).toBeGreaterThan(-1);
    expect(substringIdx).toBeGreaterThan(-1);
    expect(exactIdx).toBeLessThan(substringIdx);
  });

  it("caps the number of suggestions", async () => {
    const { values } = await completeUri("");
    expect(values.length).toBeLessThanOrEqual(COMPLETION_LIMIT);
    expect(values).toHaveLength(COMPLETION_LIMIT);
  });
});

// =============================================================================
// Read — component instance (ABox)
// =============================================================================

describe("read component instance", () => {
  it("returns an abox individual with types, label, and class pointer", async () => {
    const result = await client.readResource({
      uri: `${P.ds}global.component.button`,
    });
    const entity = parseContents(result) as {
      prefixed: string;
      box: string;
      category: string;
      types: string[];
      label: string | null;
      instanceOf: string | null;
    };
    expect(entity.prefixed).toBe(`${P.ds}global.component.button`);
    expect(entity.box).toBe("abox");
    expect(entity.category).toBe("individual");
    expect(entity.types).toContain(`${P.ds}Component`);
    expect(entity.label).toBe("Button");
    expect(entity.instanceOf).toBe(`${P.ds}Component`);
  });

  it("resolves level-1 URI objects to summaries", async () => {
    const result = await client.readResource({
      uri: `${P.ds}global.component.button`,
    });
    const entity = parseContents(result) as {
      properties: {
        predicate: string;
        values: { type: string; prefixed?: string }[];
      }[];
    };
    const tierProp = entity.properties.find(
      (p) => p.predicate === `${P.ds}tier`,
    );
    const tierValue = tierProp?.values.at(0);
    expect(tierValue?.type).toBe("uri");
    expect(tierValue?.prefixed).toBe(`${P.ds}global`);
  });

  it("includes literal values", async () => {
    const result = await client.readResource({
      uri: `${P.ds}global.component.button`,
    });
    const entity = parseContents(result) as {
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    const nameProp = entity.properties.find(
      (p) => p.predicate === `${P.ds}name`,
    );
    expect(nameProp?.values.at(0)?.type).toBe("literal");
    expect(nameProp?.values.at(0)?.value).toBe("Button");
  });

  it("keeps URL-shaped literals as literals, not URIs", async () => {
    const result = await client.readResource({
      uri: `${P.ds}global.component.button`,
    });
    const entity = parseContents(result) as {
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    const figma = entity.properties.find(
      (p) => p.predicate === `${P.ds}figmaLink`,
    );
    const value = figma?.values.at(0);
    expect(value?.type).toBe("literal");
    expect(value?.value).toBe("https://figma.com/design/example/Button");
  });
});

// =============================================================================
// Read — OWL class (TBox)
// =============================================================================

describe("read OWL class", () => {
  it("returns a tbox class enriched with schema relations", async () => {
    const result = await client.readResource({ uri: `${P.ds}UIBlock` });
    const entity = parseContents(result) as {
      box: string;
      category: string;
      types: string[];
      subClasses?: string[];
      instanceCount?: number;
      declaredProperties?: string[];
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    expect(entity.box).toBe("tbox");
    expect(entity.category).toBe("class");
    expect(entity.types).toContain(`${P.owl}Class`);
    expect(entity.subClasses).toContain(`${P.ds}Component`);
    expect(entity.subClasses).toContain(`${P.ds}Subcomponent`);
    expect(entity.declaredProperties).toContain(`${P.ds}tier`);
    expect(entity.instanceCount).toBe(0);

    const labelProp = entity.properties.find(
      (p) => p.predicate === `${P.rdfs}label`,
    );
    expect(labelProp?.values.at(0)?.value).toBe("UI Block");
  });

  it("reports superclasses and instance count for a subclass", async () => {
    const result = await client.readResource({ uri: `${P.ds}Component` });
    const entity = parseContents(result) as {
      superClasses?: string[];
      instanceCount?: number;
    };
    expect(entity.superClasses).toContain(`${P.ds}UIBlock`);
    expect(entity.instanceCount).toBe(4);
  });
});

// =============================================================================
// Read — code standard and tier
// =============================================================================

describe("read code standard", () => {
  it("returns standard with properties", async () => {
    const result = await client.readResource({ uri: `${P.cs}code_purity` });
    const entity = parseContents(result) as {
      types: string[];
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    expect(entity.types).toContain(`${P.cs}CodeStandard`);

    const nameProp = entity.properties.find(
      (p) => p.predicate === `${P.cs}name`,
    );
    expect(nameProp?.values.at(0)?.value).toBe("code/function/purity");

    const doProp = entity.properties.find((p) => p.predicate === `${P.cs}do`);
    expect(doProp?.values.length).toBeGreaterThan(0);
  });
});

describe("read tier", () => {
  it("returns tier with name", async () => {
    const result = await client.readResource({ uri: `${P.ds}apps_lxd` });
    const entity = parseContents(result) as {
      types: string[];
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    expect(entity.types).toContain(`${P.ds}Tier`);
    const nameProp = entity.properties.find(
      (p) => p.predicate === `${P.ds}name`,
    );
    expect(nameProp?.values.at(0)?.value).toBe("apps/lxd");
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe("error handling", () => {
  it("returns text/plain error for unknown entity", async () => {
    const result = await client.readResource({ uri: `${P.ds}nonexistent` });
    const first = result.contents.at(0) as ResourceContent;
    expect(first.mimeType).toBe("text/plain");
    expect(first.text).toContain("ENTITY_NOT_FOUND");
  });
});
