import { useHead } from "@canonical/react-head";
import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

function Home(): ReactElement {
  useHead({ title: "Home — Boilerplate" });

  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">Home</h1>
      <p>Welcome to the pragma router boilerplate.</p>
    </section>
  );
}

function Guide({ params }: { params: { slug: string } }): ReactElement {
  useHead({ title: `${params.slug} — Guides` });

  return (
    <section aria-labelledby="guide-title">
      <h1 id="guide-title">{params.slug}</h1>
      <p>Guide content for {params.slug}.</p>
    </section>
  );
}

const marketingRoutes = {
  home: route({
    url: "/",
    content: Home,
  }),
  guide: route({
    url: "/guides/:slug",
    content: Guide,
  }),
} as const;

export default marketingRoutes;
