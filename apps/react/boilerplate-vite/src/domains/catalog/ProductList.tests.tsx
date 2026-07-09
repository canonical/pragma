import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { IEnvironment } from "relay-runtime";
import { createMockEnvironment, MockPayloadGenerator } from "relay-test-utils";
import { describe, expect, it } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import { CATALOG_PRODUCTS } from "#relay/schema.js";
import ProductList from "./ProductList.js";

const renderProductList = (environment: IEnvironment) =>
  render(
    <RelayEnvironmentProvider environment={environment}>
      <Suspense fallback={<p>Loading catalog…</p>}>
        <ProductList />
      </Suspense>
    </RelayEnvironmentProvider>,
  );

describe("ProductList component", () => {
  it("renders the first page from the app's local mock schema", async () => {
    // Integration path: the real factory, whose local executor resolves the
    // query against src/relay/schema.ts — no relay-test-utils involved.
    renderProductList(createEnvironment());

    const firstProduct = CATALOG_PRODUCTS[0];
    expect(
      await screen.findByRole("article", { name: firstProduct?.name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`of ${CATALOG_PRODUCTS.length} products`)),
    ).toBeInTheDocument();
    expect(
      screen.getByText("More products are available."),
    ).toBeInTheDocument();
  });

  it("renders payloads resolved by a relay-test-utils mock environment", async () => {
    const environment = createMockEnvironment();
    // Queue the resolver before rendering: useLazyLoadQuery issues the
    // request during render, and the queued resolver answers it immediately.
    environment.mock.queueOperationResolver((operation) =>
      MockPayloadGenerator.generate(operation, {
        Viewer: () => ({ name: "Grace Hopper" }),
        ProductConnection: () => ({
          totalCount: 1,
          pageInfo: { hasNextPage: false },
          edges: [
            {
              node: {
                id: "Product:mocked",
                name: "Mocked Product",
                tagline: "Straight from MockPayloadGenerator",
                priceCents: 12_500,
                currency: "USD",
                rating: 4.5,
                inStock: true,
              },
            },
          ],
        }),
      }),
    );

    renderProductList(environment);

    expect(await screen.findByText("Mocked Product")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("$125.00", { exact: false })).toBeInTheDocument();
    expect(
      screen.queryByText("More products are available."),
    ).not.toBeInTheDocument();
  });
});
