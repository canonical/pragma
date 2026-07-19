import { useHead } from "@canonical/react-head";
import { type ReactElement, Suspense } from "react";
import { ClientOnly } from "#lib/index.js";
import ErrorBoundary from "./ErrorBoundary.js";
import ProductList from "./ProductList.js";

export default function CatalogPage(): ReactElement {
  useHead({ title: "Catalog — Boilerplate" });

  return (
    <section aria-labelledby="catalog-title">
      <h1 id="catalog-title">Catalog</h1>
      <p>
        This page demonstrates the Relay data layer. <code>ProductList</code>{" "}
        issues a <code>useLazyLoadQuery</code>, each <code>ProductCard</code>{" "}
        reads its own <code>useFragment</code>, and the environment resolves
        operations against the local mock schema in{" "}
        <code>src/relay/schema.ts</code> — set <code>VITE_GRAPHQL_URL</code> to
        point it at a real endpoint instead.
      </p>
      {/*
        SSR guard: `useLazyLoadQuery` fetches (and suspends) while rendering,
        and the server has no way to serialize the fetched store for the
        client yet — that lands in the follow-up SSR data-hydration PR. Until
        then `ClientOnly` keeps the query off the server render path: the
        server streams the fallback and the browser fetches after hydration.
      */}
      {/*
        The canonical Relay pairing: Suspense renders the pending state while
        `useLazyLoadQuery` is in flight, and the ErrorBoundary renders the
        failure state when the query errors (e.g. an unreachable endpoint in
        `VITE_GRAPHQL_URL` mode) — without it a thrown query error would
        unmount the whole tree to a blank page.
      */}
      <ClientOnly fallback={<p>Loading catalog…</p>}>
        <ErrorBoundary
          fallback={
            <p role="alert">
              The catalog failed to load. Reload the page to try again.
            </p>
          }
        >
          <Suspense fallback={<p>Loading catalog…</p>}>
            <ProductList />
          </Suspense>
        </ErrorBoundary>
      </ClientOnly>
    </section>
  );
}
