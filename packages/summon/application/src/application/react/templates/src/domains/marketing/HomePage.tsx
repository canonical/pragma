import { useHead } from "@canonical/react-head";
import { type ReactElement, Suspense } from "react";
import { ExampleComponent, LazyComponent } from "#lib/index.js";

export default function HomePage(): ReactElement {
  useHead({ title: "Home — Boilerplate" });

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">Home</h1>
      <p>Welcome to the pragma router boilerplate.</p>

      <h2>Example component</h2>
      <p>
        A plain component scaffolded alongside the app. It ships with a
        Storybook story (<code>ExampleComponent.stories.tsx</code>) and a test —
        the starting point for your own components.
      </p>
      <ExampleComponent>Hello from ExampleComponent</ExampleComponent>

      <h2>Streaming with Suspense</h2>
      <p>
        <code>LazyComponent</code> reads a synthetic delayed fetch with React 19{" "}
        <code>use()</code>, so it suspends. Inside this <code>Suspense</code>{" "}
        boundary the server streams the page shell first, shows the fallback,
        then flushes the resolved content in — no full client round-trip.
      </p>
      <Suspense fallback={<p>Loading streamed content…</p>}>
        <LazyComponent />
      </Suspense>
    </section>
  );
}
