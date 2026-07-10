import { useTranslation } from "@canonical/i18n-react";
import { useHead } from "@canonical/react-head";
import { type ReactElement, Suspense } from "react";
import { ExampleComponent, LazyComponent } from "#lib/index.js";

export default function HomePage(): ReactElement {
  const { t } = useTranslation();
  useHead({ title: t("home.title") });

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">{t("home.heading")}</h1>
      <p>{t("home.tagline")}</p>

      <h2>{t("home.exampleHeading")}</h2>
      {/*
        The explanatory paragraphs below are developer documentation rather
        than user-facing copy — they reference file names and APIs — so they
        stay out of the message catalogs deliberately.
      */}
      <p>
        A plain component scaffolded alongside the app. It ships with a
        Storybook story (<code>ExampleComponent.stories.tsx</code>) and a test —
        the starting point for your own components.
      </p>
      <ExampleComponent>Hello from ExampleComponent</ExampleComponent>

      <h2>{t("home.streamingHeading")}</h2>
      <p>
        <code>LazyComponent</code> reads a synthetic delayed fetch with React 19{" "}
        <code>use()</code>, so it suspends. Inside this <code>Suspense</code>{" "}
        boundary the server streams the page shell first, shows the fallback,
        then flushes the resolved content in — no full client round-trip.
      </p>
      <Suspense fallback={<p>{t("home.streamFallback")}</p>}>
        <LazyComponent />
      </Suspense>
    </section>
  );
}
