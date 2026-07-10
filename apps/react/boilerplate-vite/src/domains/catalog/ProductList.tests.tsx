import type { Locale } from "@canonical/i18n-core";
import { I18nProvider } from "@canonical/i18n-react";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { IEnvironment } from "relay-runtime";
import { createMockEnvironment, MockPayloadGenerator } from "relay-test-utils";
import { describe, expect, it } from "vitest";
import { catalogs, i18nConfig } from "#i18n/index.js";
import { createEnvironment } from "#relay/environment.js";
import { CATALOG_PRODUCTS } from "#relay/schema.js";
import ProductList from "./ProductList.js";

const renderProductList = (environment: IEnvironment, locale: Locale = "en") =>
  render(
    <I18nProvider config={i18nConfig} catalogs={catalogs} locale={locale}>
      <RelayEnvironmentProvider environment={environment}>
        <Suspense fallback={<p>Loading catalog…</p>}>
          <ProductList />
        </Suspense>
      </RelayEnvironmentProvider>
    </I18nProvider>,
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
    // Product:3 (Beacon Micro Server) is the first page's out-of-stock,
    // 4.2-rated product — pins the stock label and the rating formatting.
    expect(screen.getByText(/out of stock/)).toBeInTheDocument();
    expect(screen.getByText(/rated 4\.2 \/ 5/)).toBeInTheDocument();
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
    expect(screen.getByText(/in stock/)).toBeInTheDocument();
    expect(
      screen.queryByText("More products are available."),
    ).not.toBeInTheDocument();
  });

  it("renders French copy and localized formatting for locale fr", async () => {
    renderProductList(createEnvironment(), "fr");

    const firstProduct = CATALOG_PRODUCTS[0];
    expect(
      await screen.findByRole("article", { name: firstProduct?.name }),
    ).toBeInTheDocument();
    // Chrome is translated; product data (names, taglines) is not.
    expect(
      screen.getByText(
        new RegExp(`affichage de 4 sur ${CATALOG_PRODUCTS.length} produits`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/en rupture de stock/)).toBeInTheDocument();
    // French decimal comma via useFormatters — same data, localized rendering.
    expect(screen.getByText(/noté 4,2 \/ 5/)).toBeInTheDocument();
    expect(
      screen.getByText("D'autres produits sont disponibles."),
    ).toBeInTheDocument();
  });
});
