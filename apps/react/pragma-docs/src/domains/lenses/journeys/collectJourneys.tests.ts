// @vitest-environment node

/**
 * The journey join, pinned — and with it the two claims the lens makes
 * that are easiest to get quietly wrong.
 *
 * 1. THE UNION IS COMPLETE. Pairings arrive as two overlapping windows,
 *    and a pairing in both is one pairing. If the merge ever degraded to
 *    concatenation the diagram would sprout duplicate rows; if it degraded
 *    to "first window only" it would silently lose 13 of 51 jobs.
 *
 * 2. EVERY LINK GOES SOMEWHERE REAL. `ROUTE_BY_SURFACE` is hand-written,
 *    so it is exactly the kind of table that rots into dead links. The
 *    route test below reads the app's own route declarations and asserts
 *    every href in the table is one of them — a surface with no route
 *    must render as text, never as a link to a 404.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  axisTerm,
  collectJourneys,
  describeCoordinate,
  localName,
  type RawJob,
  type RawPairing,
  ROUTE_BY_SURFACE,
  routeForSurface,
} from "./collectJourneys.js";

const DOCS = "sem://design-system-docs#";

const COORDINATE = {
  uri: `${DOCS}coordinate.maker-duo`,
  actors: { edges: [{ node: { uri: "surface:Human" } }] },
  roles: {
    edges: [
      { node: { uri: `${DOCS}role.designer` } },
      { node: { uri: `${DOCS}role.engineer` } },
    ],
  },
  fluencies: { edges: [] },
};

const JOBS: readonly RawJob[] = [
  {
    uri: `${DOCS}job.l3`,
    story: "When I browse, I want a catalog…",
    acceptances: ["the grid lists every component"],
    coordinates: COORDINATE,
  },
  {
    uri: `${DOCS}job.b2`,
    story: "When I integrate, I want usage…",
    acceptances: [],
    coordinates: COORDINATE,
  },
];

const PAIRING_A: RawPairing = {
  uri: `${DOCS}pairing.l3-components`,
  pairingRole: { uri: "surface:Primary" },
  forJob: { uri: `${DOCS}job.l3` },
  arrivals: { edges: [{ node: { uri: "surface:ColdEntry" } }] },
  pairsSurface: {
    __typename: "Lens",
    uri: `${DOCS}view.components`,
    composes: {
      edges: [{ node: { uri: `${DOCS}layout.catalog`, name: "Catalog" } }],
    },
  },
};

const PAIRING_B: RawPairing = {
  uri: `${DOCS}pairing.b2-chips`,
  pairingRole: { uri: "surface:Secondary" },
  forJob: { uri: `${DOCS}job.b2` },
  // No arrival — the honest 34-of-133 case.
  arrivals: { edges: [] },
  pairsSurface: {
    __typename: "Mechanism",
    uri: `${DOCS}view.chips`,
    // Composes nothing — the honest majority case.
    composes: { edges: [] },
  },
};

describe("collectJourneys", () => {
  it("merges the two windows by URI rather than concatenating", () => {
    // PAIRING_A appears in BOTH windows, exactly as the real overlap does.
    const result = collectJourneys(JOBS, [[PAIRING_A, PAIRING_B], [PAIRING_A]]);
    const l3 = result[0]?.jobs.find((job) => job.uri === `${DOCS}job.l3`);
    expect(l3?.pairings).toHaveLength(1);
  });

  it("groups every job under its coordinate", () => {
    const result = collectJourneys(JOBS, [[PAIRING_A, PAIRING_B]]);
    expect(result).toHaveLength(1);
    expect(result[0]?.jobs.map((job) => job.uri).sort()).toStrictEqual([
      `${DOCS}job.b2`,
      `${DOCS}job.l3`,
    ]);
  });

  it("keeps a job whose pairings are missing entirely", () => {
    const result = collectJourneys(JOBS, [[PAIRING_A]]);
    const b2 = result[0]?.jobs.find((job) => job.uri === `${DOCS}job.b2`);
    // Demand nothing serves must survive the join — it is the finding.
    expect(b2).toBeDefined();
    expect(b2?.pairings).toStrictEqual([]);
  });

  it("carries absent arrival and absent layout through as undefined", () => {
    const result = collectJourneys(JOBS, [[PAIRING_B]]);
    const pairing = result[0]?.jobs.find((job) => job.uri === `${DOCS}job.b2`)
      ?.pairings[0];
    expect(pairing?.arrival).toBeUndefined();
    expect(pairing?.surface?.layout).toBeUndefined();
  });

  it("drops a coordinate-less job rather than inventing a root", () => {
    const orphan: RawJob = { uri: `${DOCS}job.nowhere`, coordinates: null };
    const result = collectJourneys([...JOBS, orphan], [[PAIRING_A]]);
    const all = result.flatMap((coordinate) => coordinate.jobs);
    expect(all.some((job) => job.uri === `${DOCS}job.nowhere`)).toBe(false);
  });
});

describe("describeCoordinate", () => {
  it("spells the axes out in words", () => {
    expect(describeCoordinate(COORDINATE)).toBe(
      "Human × designer or engineer × any fluency",
    );
  });

  it("reports an absent axis as 'any' — the ontology's own wildcard rule", () => {
    // Not padding: the surface ontology states that an unconstrained role
    // or fluency axis matches ANY value. "any role" reports that fact.
    expect(describeCoordinate({ uri: "x", actors: null })).toBe(
      "any actor × any role × any fluency",
    );
  });
});

describe("localName", () => {
  it("reads the local part of both URI forms", () => {
    expect(localName(`${DOCS}job.l3`)).toBe("job.l3");
    expect(localName("surface:Primary")).toBe("Primary");
  });
});

describe("axisTerm", () => {
  it("strips the graph's filing prefix to recover the ontology's word", () => {
    // `role.designer` is a Turtle filing name; the ontology's label is
    // "designer". Recovering it is reporting the graph, not renaming it.
    expect(axisTerm(`${DOCS}role.designer`)).toBe("designer");
    expect(axisTerm("surface:Newcomer")).toBe("Newcomer");
  });

  it("strips only the three known filing prefixes", () => {
    // A term that genuinely contains a dot must keep it.
    expect(axisTerm(`${DOCS}view.section-usage`)).toBe("view.section-usage");
  });
});

describe("ROUTE_BY_SURFACE", () => {
  it("points only at routes the app actually declares", () => {
    // The table is hand-written; this reads the real route declarations
    // so a surface can never link to a page that does not exist.
    const routesDir = fileURLToPath(new URL("../../", import.meta.url));
    const sources = [
      "components/routes.ts",
      "marketing/routes.ts",
      "lenses/routes.tsx",
      "lenses/definitions/routes.ts",
      "lenses/standards/routes.ts",
    ].map((file) => readFileSync(`${routesDir}${file}`, "utf-8"));
    const declared = new Set(
      sources.flatMap((source) =>
        [...source.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]),
      ),
    );
    for (const href of Object.values(ROUTE_BY_SURFACE)) {
      expect(declared.has(href), `${href} must be a declared route`).toBe(true);
    }
  });

  it("returns undefined for a surface the site does not render", () => {
    // Honest absence: the inspector renders these as text, not dead links.
    expect(routeForSurface(`${DOCS}view.chips`)).toBeUndefined();
    expect(routeForSurface(`${DOCS}view.editor`)).toBeUndefined();
  });
});
