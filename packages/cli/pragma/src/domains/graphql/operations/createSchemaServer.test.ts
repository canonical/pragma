import { afterEach, describe, expect, it } from "vitest";
import { EX_NAMESPACE, GRAPHQL_CLEAN_TTL } from "#testing";
import { DEFAULT_PREFIX_MAP } from "../../shared/prefixes.js";
import createSchemaServer, { type SchemaServer } from "./createSchemaServer.js";

const PREFIXES = { ...DEFAULT_PREFIX_MAP, ex: EX_NAMESPACE };

describe("createSchemaServer", () => {
  let server: SchemaServer | undefined;

  afterEach(() => {
    server?.dispose();
    server = undefined;
  });

  it("compiles inline sources and serves an introspectable schema", async () => {
    server = await createSchemaServer({
      sources: [
        { content: GRAPHQL_CLEAN_TTL, format: "turtle", path: "clean.ttl" },
      ],
      prefixes: PREFIXES,
    });

    const response = await server.handler(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "{ __schema { queryType { name } } }",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data?: { __schema?: { queryType?: { name?: string } } };
    };
    expect(body.data?.__schema?.queryType?.name).toBe("Query");
    expect(Array.isArray(server.diagnostics)).toBe(true);
  });

  it("throws a STORE_ERROR on invalid TTL", async () => {
    await expect(
      createSchemaServer({
        sources: [{ content: "not turtle .", format: "turtle", path: "x.ttl" }],
        prefixes: PREFIXES,
      }),
    ).rejects.toMatchObject({ code: "STORE_ERROR" });
  });
});
