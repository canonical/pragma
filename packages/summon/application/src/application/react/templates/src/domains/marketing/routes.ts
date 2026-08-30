import type { StandardSchemaV1 } from "@canonical/router-core";
import { route } from "@canonical/router-core";
import GuidePage from "./GuidePage.js";
import HomePage from "./HomePage.js";

/**
 * Standard Schema v1 params validator — the same interface Zod, Valibot, and
 * ArkType schemas implement, so any of them can be dropped in here directly.
 * A slug that is not lowercase kebab-case makes the URL a non-match: the
 * router falls through to the not-found route (404) instead of rendering.
 */
const guideParamsSchema: StandardSchemaV1<
  { readonly slug: string },
  { readonly slug: string }
> = {
  "~standard": {
    version: 1,
    vendor: "boilerplate",
    validate(value) {
      const record = value as { slug?: string };

      return record.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(record.slug)
        ? { value: { slug: record.slug } }
        : { issues: [{ message: "slug must be lowercase kebab-case" }] };
    },
  },
};

const routes = {
  home: route({
    url: "/",
    content: HomePage,
  }),
  guide: route({
    url: "/guides/:slug",
    params: guideParamsSchema,
    content: GuidePage,
  }),
} as const;

export default routes;
