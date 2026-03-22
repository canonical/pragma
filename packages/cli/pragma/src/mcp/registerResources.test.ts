import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestMcpClient } from "#testing";
import { P } from "../domains/shared/prefixes.js";

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

function parseContents(result: { contents: unknown[] }): unknown {
  const first = result.contents[0] as ResourceContent;
  return JSON.parse(first.text);
}

// =============================================================================
// Resource listing
// =============================================================================

describe("resource listing", () => {
  it("registers 1 resource template", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates).toHaveLength(1);
    expect(resourceTemplates[0]?.uriTemplate).toBe("pragma:{+uri}");
  });

  it("lists resources including known entities", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(`pragma:${P.ds}button`);
    expect(uris).toContain(`pragma:${P.ds}card`);
    expect(uris).toContain(`pragma:${P.ds}global`);
  });

  it("lists OWL classes as resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(`pragma:${P.ds}UIBlock`);
    expect(uris).toContain(`pragma:${P.ds}Component`);
  });

  it("lists code standards as resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(`pragma:${P.cs}react_folder`);
    expect(uris).toContain(`pragma:${P.cs}code_purity`);
  });

  it("uses label as resource name when available", async () => {
    const { resources } = await client.listResources();
    const button = resources.find((r) => r.uri === `pragma:${P.ds}button`);
    expect(button?.name).toBe("Button");
  });
});

// =============================================================================
// Read instances
// =============================================================================

describe("read component instance", () => {
  it("returns entity with types and label", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}button`,
    });
    const entity = parseContents(result) as {
      uri: string;
      prefixed: string;
      types: string[];
      label: string | null;
      properties: { predicate: string; values: unknown[] }[];
    };
    expect(entity.prefixed).toBe(`${P.ds}button`);
    expect(entity.types).toContain(`${P.ds}Component`);
    expect(entity.label).toBe("Button");
  });

  it("resolves level-1 URI objects to summaries", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}button`,
    });
    const entity = parseContents(result) as {
      properties: {
        predicate: string;
        values: {
          type: string;
          uri?: string;
          prefixed?: string;
          label?: string | null;
        }[];
      }[];
    };

    const tierProp = entity.properties.find(
      (p) => p.predicate === `${P.ds}tier`,
    );
    expect(tierProp).toBeDefined();
    const tierValue = tierProp?.values[0];
    expect(tierValue?.type).toBe("uri");
    expect(tierValue?.prefixed).toBe(`${P.ds}global`);
  });

  it("includes literal values", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}button`,
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
    expect(nameProp).toBeDefined();
    expect(nameProp?.values[0]?.type).toBe("literal");
    expect(nameProp?.values[0]?.value).toBe("Button");
  });
});

// =============================================================================
// Read OWL classes
// =============================================================================

describe("read OWL class", () => {
  it("returns class with rdfs:label", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}UIBlock`,
    });
    const entity = parseContents(result) as {
      types: string[];
      label: string | null;
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    expect(entity.types).toContain(`${P.owl}Class`);
    const labelProp = entity.properties.find(
      (p) => p.predicate === `${P.rdfs}label`,
    );
    expect(labelProp?.values[0]?.value).toBe("UI Block");
  });
});

// =============================================================================
// Read code standards
// =============================================================================

describe("read code standard", () => {
  it("returns standard with properties", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.cs}code_purity`,
    });
    const entity = parseContents(result) as {
      types: string[];
      label: string | null;
      properties: {
        predicate: string;
        values: { type: string; value?: string }[];
      }[];
    };
    expect(entity.types).toContain(`${P.cs}CodeStandard`);

    const nameProp = entity.properties.find(
      (p) => p.predicate === `${P.cs}name`,
    );
    expect(nameProp?.values[0]?.value).toBe("code/function/purity");

    const doProp = entity.properties.find((p) => p.predicate === `${P.cs}do`);
    expect(doProp).toBeDefined();
    expect(doProp?.values.length).toBeGreaterThan(0);

    const dontProp = entity.properties.find(
      (p) => p.predicate === `${P.cs}dont`,
    );
    expect(dontProp).toBeDefined();
  });
});

// =============================================================================
// Read tiers
// =============================================================================

describe("read tier", () => {
  it("returns tier with name", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}apps_lxd`,
    });
    const entity = parseContents(result) as {
      types: string[];
      properties: {
        predicate: string;
        values: { type: string; value?: string; prefixed?: string }[];
      }[];
    };
    expect(entity.types).toContain(`${P.ds}Tier`);

    const nameProp = entity.properties.find(
      (p) => p.predicate === `${P.ds}name`,
    );
    expect(nameProp?.values[0]?.value).toBe("apps/lxd");
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe("error handling", () => {
  it("returns text/plain error for unknown entity", async () => {
    const result = await client.readResource({
      uri: `pragma:${P.ds}nonexistent`,
    });
    const first = result.contents[0] as ResourceContent;
    expect(first.mimeType).toBe("text/plain");
    expect(first.text).toContain("ENTITY_NOT_FOUND");
  });
});
