import { fetchQuery } from "relay-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import productListQueryNode, {
  type ProductListQuery,
} from "./__generated__/ProductListQuery.graphql.js";
import { createEnvironment } from "./environment.js";
import { CATALOG_PRODUCTS } from "./schema.js";

/** Minimal valid GraphQL payload for {@link ProductListQuery}. */
const ENDPOINT_PAYLOAD = {
  data: {
    viewer: {
      name: "Endpoint Viewer",
      products: {
        totalCount: 0,
        pageInfo: { hasNextPage: false },
        edges: [],
      },
    },
  },
};

const fetchProductList = (environment: ReturnType<typeof createEnvironment>) =>
  fetchQuery<ProductListQuery>(environment, productListQueryNode, {
    count: 2,
  }).toPromise();

describe("createEnvironment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("executes operations against the local mock schema by default", async () => {
    const data = await fetchProductList(createEnvironment());

    expect(data?.viewer.name).toBe("Ada Lovelace");
    expect(data?.viewer.products.totalCount).toBe(CATALOG_PRODUCTS.length);
    expect(data?.viewer.products.edges).toHaveLength(2);
    expect(data?.viewer.products.pageInfo.hasNextPage).toBe(true);
  });

  it("posts operations to the endpoint when a URL is passed", async () => {
    const fetchSpy = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => Response.json(ENDPOINT_PAYLOAD, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const data = await fetchProductList(
      createEnvironment({ graphqlUrl: "https://api.example.test/graphql" }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/graphql",
    );
    expect(data?.viewer.name).toBe("Endpoint Viewer");
  });

  it("reads the endpoint URL from VITE_GRAPHQL_URL", async () => {
    const fetchSpy = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => Response.json(ENDPOINT_PAYLOAD, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("VITE_GRAPHQL_URL", "https://env.example.test/graphql");

    await fetchProductList(createEnvironment());

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "https://env.example.test/graphql",
    );
  });

  it("keeps stores independent across environments", async () => {
    const first = createEnvironment();
    const second = createEnvironment();
    await fetchProductList(first);

    expect(first.getStore().getSource().getRecordIDs().length).toBeGreaterThan(
      1,
    );
    // An untouched store holds only Relay's client root record.
    expect(second.getStore().getSource().getRecordIDs()).toEqual([
      "client:root",
    ]);
  });
});
