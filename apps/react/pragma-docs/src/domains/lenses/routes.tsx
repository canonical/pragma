/**
 * The v1 lens routes that have no views yet — honest minimal stubs
 * (P-4.1). Each states what lands on its canvas and which P-item builds
 * it; the shell frame around them is the finished product. Home keeps its
 * existing page (`#domains/marketing`); `/guides/:slug` (the reading
 * detail) already exists there too and stays. Components graduated to its
 * real views (`#domains/components`, P-5) and left this file.
 *
 * None of these declare `SHELL_STRIP_META_KEY` strip slots: a stub has no
 * controls or status to claim, so every strip socket renders its sensible
 * empty — which is exactly what `frameStability.tests.tsx` measures.
 */

import { route } from "@canonical/router-core";
import LensPlaceholder from "./LensPlaceholder.js";

const routes = {
  definitions: route({
    url: "/definitions",
    content: () => (
      <LensPlaceholder
        builtBy="P-5 (the explorer triptych)"
        lands="The semantic model made explorable — term rail, the graph in its underground well, inspector; the governance lens and maturity bar ride the mode strip."
        title="Definitions"
      />
    ),
  }),
  standards: route({
    url: "/standards",
    content: () => (
      <LensPlaceholder
        builtBy="P-5 (reading views)"
        lands="The rules and contracts — code, accessibility, content — chip-linked to what they govern."
        title="Standards"
      />
    ),
  }),
  guides: route({
    url: "/guides",
    content: () => (
      <LensPlaceholder
        builtBy="P-5 (reading views)"
        lands="Long-form reading: foundations, setup, the analog map — prose that references entities through chips."
        title="Guides"
      />
    ),
  }),
} as const;

export default routes;
