/**
 * The layout-hypothesis playground: a disposable surface for rendering real
 * graph entities while the docsite's views are being designed. Nothing here is
 * a committed design — it exists so layout ideas can be tried against live
 * pragma data instead of lorem ipsum.
 */

import { useHead } from "@canonical/react-head";
import { type ReactElement, Suspense } from "react";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import ComponentProbe from "./ComponentProbe.js";
import { PROBE_URI } from "./probeQuery.js";

export default function PlaygroundPage(): ReactElement {
  useHead({ title: "Playground — pragma docs" });

  return (
    <section aria-labelledby="playground-title">
      <h1 id="playground-title">Playground</h1>
      <p>
        A real projection of the pragma graph: <code>ComponentProbe</code>{" "}
        issues a <code>useLazyLoadQuery</code> against the in-process ke-graphql
        schema at <code>/graphql</code> — the same endpoint GraphiQL serves.
      </p>
      {/*
        No `ClientOnly` guard any more (P-2 Stage 1): the SSR dev servers
        execute the route's query in-process before rendering and seed the
        per-request Relay environment, so the hook below reads the warm store
        without suspending. The Suspense boundary still serves the SPA cells
        (and any cell whose prepare step degraded), where the query fetches
        over HTTP after hydration.
      */}
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the graph…</p>}>
          <ComponentProbe uri={PROBE_URI} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
