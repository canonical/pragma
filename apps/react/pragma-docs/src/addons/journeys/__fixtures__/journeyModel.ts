/**
 * The shared demand-model fixture for the journeys COMPONENT tests — the
 * same awkward shapes `buildJourneyGraph.tests.ts` uses, in the form the
 * components consume (`JourneyCoordinate[]`).
 *
 * Deliberately shaped like the real graph rather than a tidy tree: a
 * shared coordinate, a surface two jobs both reach, a pairing with no
 * arrival, a job with no pairings, and a surface composing no layout —
 * because those are the shapes the live model actually contains (34 of
 * 133 pairings carry no arrival; only 16 of 133 reach a layout; one job
 * of 52 is served by nothing).
 *
 * Lives in `__fixtures__` beside the record captures: imported by tests,
 * never collected as one.
 */

import type { JourneyCoordinate } from "../JourneyWell/buildJourneyGraph.js";

const SURFACE = "sem://surface#";
const DOCS = "sem://design-system-docs#";

/** The coordinate whose role axis names a role — the persona axis's only
 * honest match (see `journeyFilter.ts` for the measurement). */
export const MAKER_COORDINATE = `${DOCS}coordinate.maker-duo`;
/** A coordinate with an EMPTY role axis: the ontology reads that as
 * "any role", so it matches every persona. */
export const WILDCARD_COORDINATE = `${DOCS}coordinate.builder-pair`;

export const BROWSE_JOB = `${DOCS}job.l3`;
export const ORPHAN_JOB = `${DOCS}job.orphan`;

export const PERSONA_WRITER = `${DOCS}persona.writer`;
export const PERSONA_ARCHITECT = `${DOCS}persona.architect`;

/** Role axes per coordinate, as the explorer derives them from the query. */
export const ROLES_BY_COORDINATE: Readonly<Record<string, readonly string[]>> =
  {
    [MAKER_COORDINATE]: [`${DOCS}role.writer`],
    // Empty — the wildcard case.
    [WILDCARD_COORDINATE]: [],
  };

export const JOURNEY_MODEL: readonly JourneyCoordinate[] = [
  {
    uri: MAKER_COORDINATE,
    label: "any actor × writer × any fluency",
    jobs: [
      {
        uri: BROWSE_JOB,
        label: "job.l3",
        // A full sentence in the reader's voice — the legible rail label is
        // its first clause, not the `job.l3` filing slug.
        story:
          "When I browse the component catalogue, I want the whole set at a glance",
        pairings: [
          {
            uri: `${DOCS}pairing.l3-components`,
            label: "pairing.l3-components",
            role: `${SURFACE}Primary`,
            arrival: `${SURFACE}ColdEntry`,
            surface: {
              uri: `${DOCS}view.components`,
              label: "view.components",
              surfaceType: "Lens",
              href: "/components",
              layout: { uri: `${DOCS}layout.catalog`, label: "Catalog" },
            },
          },
          {
            // No arrival, and a surface composing NO layout — the row
            // must end at its surface with no trailing edge.
            uri: `${DOCS}pairing.l3-chips`,
            label: "pairing.l3-chips",
            role: `${SURFACE}Secondary`,
            arrival: null,
            surface: {
              uri: `${DOCS}view.chips`,
              label: "view.chips",
              surfaceType: "Mechanism",
              href: null,
              layout: null,
            },
          },
        ],
      },
      {
        // Demand nothing serves — it must still earn a row.
        uri: ORPHAN_JOB,
        label: "job.orphan",
        pairings: [],
      },
    ],
  },
  {
    uri: WILDCARD_COORDINATE,
    label: "any actor × any role × any fluency",
    jobs: [
      {
        uri: `${DOCS}job.b2`,
        label: "job.b2",
        pairings: [
          {
            uri: `${DOCS}pairing.b2-components`,
            label: "pairing.b2-components",
            role: `${SURFACE}Primary`,
            arrival: `${SURFACE}SubjectKept`,
            // The SHARED surface: reached from a second coordinate too.
            surface: {
              uri: `${DOCS}view.components`,
              label: "view.components",
              surfaceType: "Lens",
              href: "/components",
              layout: { uri: `${DOCS}layout.catalog`, label: "Catalog" },
            },
          },
        ],
      },
    ],
  },
];

/** Every persona the live graph carries (6, measured). */
export const PERSONAS: readonly string[] = [
  `${DOCS}persona.agent`,
  PERSONA_ARCHITECT,
  `${DOCS}persona.designer`,
  `${DOCS}persona.engineer`,
  `${DOCS}persona.steward`,
  PERSONA_WRITER,
];
