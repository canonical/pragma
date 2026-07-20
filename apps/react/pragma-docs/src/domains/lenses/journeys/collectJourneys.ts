/**
 * The demand model's shape, reassembled into journeys.
 *
 * The graph does NOT hand back a journey. It hands back jobs (each with
 * one coordinate) and pairings (each naming its job and its surface), and
 * `Job` carries no inverse to its pairings — `Pairing.forJob` points one
 * way only, verified by introspection. So the join happens here, and this
 * module exists to make that join a pure, testable function rather than a
 * tangle inside a component.
 *
 * PURE by construction: query data in, a sorted `JourneyCoordinate[]` out.
 * `buildJourneyGraph` then turns that into positions. Splitting the two
 * keeps the layout's determinism argument narrow — this module decides
 * WHAT is on screen, that one decides WHERE.
 *
 * THE UNION. Pairings arrive as two overlapping windows (`first:100` and
 * `last:100` — see `journeysQuery.ts` for why), so they are merged by URI
 * before anything else happens. A pairing appearing in both windows is
 * one pairing.
 */

import type {
  JourneyCoordinate,
  JourneyJob,
  JourneyPairing,
} from "./JourneyWell/buildJourneyGraph.js";

/** A pairing as either window delivers it. */
export interface RawPairing {
  readonly uri: string;
  readonly pairingRole?: { readonly uri: string } | null | undefined;
  readonly forJob?: { readonly uri: string } | null | undefined;
  readonly arrivals?:
    | { readonly edges: readonly { readonly node: { readonly uri: string } }[] }
    | null
    | undefined;
  readonly pairsSurface?: RawSurface | null | undefined;
}

/** A surface as the inline fragments deliver it. */
export interface RawSurface {
  readonly __typename?: string | undefined;
  readonly uri: string;
  readonly composes?:
    | {
        readonly edges: readonly {
          readonly node: {
            readonly uri: string;
            readonly name?: string | null | undefined;
          };
        }[];
      }
    | null
    | undefined;
}

/** A job as the root field delivers it. */
export interface RawJob {
  readonly uri: string;
  readonly story?: string | null | undefined;
  readonly acceptances?: readonly string[] | null | undefined;
  readonly coordinates?: RawCoordinate | null | undefined;
}

/** A coordinate, with the three axes that spell it out in words. */
export interface RawCoordinate {
  readonly uri: string;
  readonly actors?: RawTermList | null | undefined;
  readonly roles?: RawTermList | null | undefined;
  readonly fluencies?: RawTermList | null | undefined;
}

interface RawTermList {
  readonly edges: readonly { readonly node: { readonly uri: string } }[];
}

/** The local name of a URI — the display label the graph implies. */
export const localName = (uri: string): string => {
  const local = uri.split(/[#:]/).at(-1);
  return local === undefined || local.length === 0 ? uri : local;
};

/**
 * A coordinate AXIS value's display term. The docs graph names its axis
 * instances with a type-prefixed local name (`role.designer`,
 * `role.engineer`) because a Turtle local name has to be unique across
 * the file. That prefix is filing, not vocabulary: the ontology's own
 * label for the term is "designer".
 *
 * Stripping the leading `role.` / `fluency.` / `actor.` segment therefore
 * RECOVERS the graph's word rather than inventing one — and it strips
 * only those three known filing prefixes, so a term that genuinely
 * contains a dot keeps it.
 */
const AXIS_FILING_PREFIX = /^(?:role|fluency|actor)\./;

export const axisTerm = (uri: string): string =>
  localName(uri).replace(AXIS_FILING_PREFIX, "");

/** Read a connection's node URIs, tolerating an absent connection. */
const uris = (list: RawTermList | null | undefined): readonly string[] =>
  (list?.edges ?? []).map((edge) => edge.node.uri);

/**
 * Spell a coordinate out in words, from its own axes. An ABSENT axis is
 * rendered as "any": the ontology says so explicitly — an unconstrained
 * role or fluency axis is a WILDCARD that matches anything, not a gap.
 * Saying "any role" is therefore reporting the data, not padding it.
 */
export const describeCoordinate = (
  coordinate: RawCoordinate | null | undefined,
): string => {
  if (coordinate == null) return "no coordinate";
  const actors = uris(coordinate.actors).map(axisTerm);
  const roles = uris(coordinate.roles).map(axisTerm);
  const fluencies = uris(coordinate.fluencies).map(axisTerm);
  return [
    actors.length > 0 ? actors.join(" or ") : "any actor",
    roles.length > 0 ? roles.join(" or ") : "any role",
    fluencies.length > 0 ? fluencies.join(" or ") : "any fluency",
  ].join(" × ");
};

/**
 * The docsite routes the demand model's surfaces actually land on. A
 * surface with no entry here HAS NO ROUTE — the inspector renders it as
 * plain text rather than a dead link, which is the honest rendering of a
 * surface the site does not (yet) build.
 *
 * Keyed by the surface URI's local name so the table reads as the docs
 * graph writes it. Deliberately hand-maintained and deliberately short:
 * inventing a route from a URI pattern would produce links to pages that
 * do not exist.
 */
export const ROUTE_BY_SURFACE: Readonly<Record<string, string>> = {
  "view.home": "/",
  "view.components": "/components",
  "view.definitions": "/definitions",
  "view.standards": "/standards",
  "view.guides": "/guides",
};

/** The route for a surface, or undefined when the site renders none. */
export const routeForSurface = (uri: string): string | undefined =>
  ROUTE_BY_SURFACE[localName(uri)];

/**
 * Merge the two pairing windows by URI, then group into the coordinate →
 * job → pairing tree the layout consumes.
 *
 * Jobs with NO coordinate are dropped from the diagram (the diagram is
 * rooted at Coordinate per ruling R1, so a coordinate-less job has no
 * root to hang from) — but every job in the live model has one, measured:
 * 52 of 52.
 */
export const collectJourneys = (
  jobs: readonly RawJob[],
  windows: readonly (readonly RawPairing[])[],
): readonly JourneyCoordinate[] => {
  const merged = new Map<string, RawPairing>();
  for (const window of windows) {
    for (const pairing of window) merged.set(pairing.uri, pairing);
  }

  const pairingsByJob = new Map<string, JourneyPairing[]>();
  for (const pairing of merged.values()) {
    const jobUri = pairing.forJob?.uri;
    if (jobUri === undefined) continue;
    const surface = pairing.pairsSurface;
    const layoutNode = surface?.composes?.edges[0]?.node;
    const list = pairingsByJob.get(jobUri) ?? [];
    list.push({
      uri: pairing.uri,
      label: localName(pairing.uri),
      role: pairing.pairingRole?.uri,
      // One arrival at most in this model; absent is data (34 of 133).
      arrival: pairing.arrivals?.edges[0]?.node.uri,
      surface:
        surface == null
          ? undefined
          : {
              uri: surface.uri,
              label: localName(surface.uri),
              surfaceType: surface.__typename,
              href: routeForSurface(surface.uri),
              layout:
                layoutNode === undefined
                  ? undefined
                  : {
                      uri: layoutNode.uri,
                      label: layoutNode.name ?? localName(layoutNode.uri),
                    },
            },
    });
    pairingsByJob.set(jobUri, list);
  }

  const byCoordinate = new Map<
    string,
    { raw: RawCoordinate; jobs: JourneyJob[] }
  >();
  for (const job of jobs) {
    const coordinate = job.coordinates;
    if (coordinate == null) continue;
    const bucket = byCoordinate.get(coordinate.uri) ?? {
      raw: coordinate,
      jobs: [],
    };
    bucket.jobs.push({
      uri: job.uri,
      label: localName(job.uri),
      pairings: pairingsByJob.get(job.uri) ?? [],
    });
    byCoordinate.set(coordinate.uri, bucket);
  }

  return [...byCoordinate.values()].map((bucket) => ({
    uri: bucket.raw.uri,
    label: describeCoordinate(bucket.raw),
    jobs: bucket.jobs,
  }));
};
