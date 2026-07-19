/**
 * The layout-hypothesis playground: a disposable surface for rendering real
 * graph entities while the docsite's views are being designed. Nothing here is
 * a committed design — it exists so layout ideas can be tried against live
 * pragma data instead of lorem ipsum.
 */

import { useHead } from "@canonical/react-head";
import { type ReactElement, Suspense } from "react";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import { ClientOnly } from "#lib/index.js";
import ComponentProbe from "./ComponentProbe.js";

/** The entity the probe renders — Button, the pilot's exemplar. */
const PROBE_URI = "ds:global.component.button";

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
        SSR guard: `useLazyLoadQuery` fetches (and suspends) while rendering,
        and server-side data serialization/hydration is the P-2 track's
        deliverable. Until it lands, `ClientOnly` keeps the query off the
        server render path: the server streams the fallback and the browser
        fetches after hydration.
      */}
      <ClientOnly fallback={<p>Loading the graph…</p>}>
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
      </ClientOnly>
    </section>
  );
}
