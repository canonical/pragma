import { I18nProvider } from "@canonical/i18n-react";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { createMockEnvironment } from "relay-test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogs, i18nConfig } from "#i18n/index.js";
import ErrorBoundary from "./ErrorBoundary.js";
import ProductList from "./ProductList.js";

describe("ErrorBoundary component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children while nothing throws", () => {
    render(
      <ErrorBoundary fallback={<p role="alert">Failed.</p>}>
        <p>Catalog content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Catalog content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the fallback when the catalog query errors", async () => {
    // React logs errors caught by boundaries; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const environment = createMockEnvironment();
    // Resolving an operation with an Error rejects it, which makes
    // `useLazyLoadQuery` re-throw during render — exactly what happens when
    // a real endpoint is unreachable. Queue it before rendering, as the
    // query is issued during the initial render.
    environment.mock.queueOperationResolver(
      () => new Error("backend unreachable"),
    );

    // ProductList translates its chrome, so it renders inside the provider —
    // the same shape CatalogPage produces.
    render(
      <I18nProvider config={i18nConfig} catalogs={catalogs}>
        <RelayEnvironmentProvider environment={environment}>
          <ErrorBoundary
            fallback={<p role="alert">The catalog failed to load.</p>}
          >
            <Suspense fallback={<p>Loading catalog…</p>}>
              <ProductList />
            </Suspense>
          </ErrorBoundary>
        </RelayEnvironmentProvider>
      </I18nProvider>,
    );

    // The fallback replaces the subtree instead of white-screening.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The catalog failed to load.",
    );
    expect(screen.queryByText(/products/)).not.toBeInTheDocument();
  });
});
