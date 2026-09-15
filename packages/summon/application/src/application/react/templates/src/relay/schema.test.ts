import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS, executeLocalOperation } from "./schema.js";

interface ProductsPage {
  readonly viewer: {
    readonly products: {
      readonly edges: readonly {
        readonly cursor: string;
        readonly node: { readonly id: string; readonly name: string };
      }[];
      readonly pageInfo: {
        readonly endCursor: string | null;
        readonly hasNextPage: boolean;
      };
      readonly totalCount: number;
    };
  };
}

const PRODUCTS_QUERY = `
  query SchemaTestsProductsQuery($first: Int, $after: String) {
    viewer {
      products(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            name
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
        totalCount
      }
    }
  }
`;

const fetchProductsPage = async (variables: {
  first?: number;
  after?: string;
}): Promise<ProductsPage> => {
  const result = await executeLocalOperation({
    text: PRODUCTS_QUERY,
    variables,
  });
  expect(result.errors).toBeUndefined();
  return result.data as ProductsPage;
};

describe("executeLocalOperation", () => {
  it("resolves the viewer with the first page of products", async () => {
    const data = await fetchProductsPage({ first: 2 });
    const { products } = data.viewer;

    expect(products.totalCount).toBe(CATALOG_PRODUCTS.length);
    expect(products.edges.map((edge) => edge.node.name)).toEqual([
      CATALOG_PRODUCTS[0]?.name,
      CATALOG_PRODUCTS[1]?.name,
    ]);
    expect(products.pageInfo.hasNextPage).toBe(true);
  });

  it("paginates forward from an end cursor without gaps or overlap", async () => {
    const firstPage = await fetchProductsPage({ first: 2 });
    const { endCursor } = firstPage.viewer.products.pageInfo;
    expect(endCursor).not.toBeNull();

    const secondPage = await fetchProductsPage({
      first: 2,
      after: endCursor as string,
    });
    expect(
      secondPage.viewer.products.edges.map((edge) => edge.node.id),
    ).toEqual([CATALOG_PRODUCTS[2]?.id, CATALOG_PRODUCTS[3]?.id]);
  });

  it("reports the end of the catalog", async () => {
    const page = await fetchProductsPage({ first: CATALOG_PRODUCTS.length });
    expect(page.viewer.products.pageInfo.hasNextPage).toBe(false);
    expect(page.viewer.products.edges).toHaveLength(CATALOG_PRODUCTS.length);
  });

  it("rejects malformed cursors as a GraphQL error", async () => {
    const result = await executeLocalOperation({
      text: PRODUCTS_QUERY,
      variables: { first: 1, after: "not-a-cursor" },
    });
    expect(result.errors?.[0]?.message).toContain("Invalid cursor");
  });

  it("rejects negative cursor indices that encodeCursor can never produce", async () => {
    const result = await executeLocalOperation({
      text: PRODUCTS_QUERY,
      variables: { first: 1, after: "cursor:-1" },
    });
    expect(result.errors?.[0]?.message).toContain("Invalid cursor");
  });

  it("looks up nodes by global ID and misses unknown IDs", async () => {
    const nodeQuery = `
      query SchemaTestsNodeQuery($id: ID!) {
        node(id: $id) {
          id
          ... on Product {
            name
          }
        }
      }
    `;
    const target = CATALOG_PRODUCTS[3];

    const hit = await executeLocalOperation({
      text: nodeQuery,
      variables: { id: target?.id },
    });
    expect(hit.data).toEqual({
      node: { id: target?.id, name: target?.name },
    });

    const miss = await executeLocalOperation({
      text: nodeQuery,
      variables: { id: "Product:does-not-exist" },
    });
    expect(miss.data).toEqual({ node: null });
  });

  it("returns validation problems as GraphQL errors, not exceptions", async () => {
    const result = await executeLocalOperation({
      text: "query SchemaTestsInvalidQuery { nope }",
    });
    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toContain("nope");
  });
});
