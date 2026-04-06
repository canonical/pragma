import { route } from "@canonical/router-core";
import type { ReactElement } from "react";

interface HomeData {
  readonly highlights: readonly string[];
}

interface GuideData {
  readonly sections: readonly string[];
  readonly slug: string;
  readonly summary: string;
}

const marketingRoutes = {
  guide: route({
    url: "/guides/:slug",
    fetch: async ({ slug }: { slug: string }): Promise<GuideData> => ({
      sections: [
        "Flat route triplets keep route definitions colocated with the domain.",
        "Hovering a navigation link prefetches guide data before you click.",
        "Server rendering dehydrates the loaded route into window.__INITIAL_DATA__.",
      ],
      slug,
      summary:
        "This guide shows how the Vite boilerplate wires router-core and router-react together.",
    }),
    content: ({ data }: { data: GuideData }): ReactElement => {
      return (
        <section className="route-panel stack" aria-labelledby="guide-title">
          <p className="eyebrow">Marketing domain</p>
          <h1 id="guide-title">Guide: {data.slug}</h1>
          <p className="lede">{data.summary}</p>
          <ul className="feature-list">
            {data.sections.map((section: string) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </section>
      );
    },
  }),
  home: route({
    url: "/",
    fetch: async (): Promise<HomeData> => ({
      highlights: [
        "SSR and hydration share one route map.",
        "Protected routes redirect through local middleware.",
        "Domain modules compose into a single app shell.",
      ],
    }),
    content: ({ data }: { data: HomeData }): ReactElement => {
      return (
        <section className="route-panel stack" aria-labelledby="home-title">
          <p className="eyebrow">Router boilerplate</p>
          <h1 id="home-title">Canonical router integration demo</h1>
          <p className="lede">
            This boilerplate demonstrates SSR, hydration, hover prefetch, and an
            auth redirect using the new router packages.
          </p>
          <ul className="feature-list">
            {data.highlights.map((highlight: string) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      );
    },
  }),
} as const;

export default marketingRoutes;
