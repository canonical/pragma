/**
 * The lens's filter, and the two rulings it encodes.
 *
 * R1: there is no persona column and no exact persona join — the axis is
 * approximate, and this module is where that honesty is enforced rather
 * than merely documented.
 *
 * The scale ruling: the default view is FILTERED, because ~260 nodes is
 * unreadable and virtualisation would break the well's SSR determinism.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_JOURNEYS_FILTER,
  defaultJourneyFilter,
  PERSONA_MATCH_NOTE,
  personaMatchesCoordinate,
  personaTerm,
} from "./journeyFilter.js";

const DOCS = "sem://design-system-docs#";

describe("defaultJourneyFilter", () => {
  it("defaults to ONE coordinate — the readable view, not all 260 nodes", () => {
    const filter = defaultJourneyFilter([
      `${DOCS}coordinate.b`,
      `${DOCS}coordinate.a`,
    ]);
    // Sorted, so the choice is deterministic across server and client.
    expect(filter.coordinate).toBe(`${DOCS}coordinate.a`);
    expect(filter.persona).toBeUndefined();
  });

  it("prefers the SELECTED job's coordinate — a link must land on its job", () => {
    // The bug this prevents: following a link to a job and landing on a
    // diagram that does not contain it.
    const filter = defaultJourneyFilter(
      [`${DOCS}coordinate.a`, `${DOCS}coordinate.z`],
      `${DOCS}coordinate.z`,
    );
    expect(filter.coordinate).toBe(`${DOCS}coordinate.z`);
  });

  it("is stable — the same inputs give the same filter", () => {
    const uris = [`${DOCS}coordinate.b`, `${DOCS}coordinate.a`];
    expect(defaultJourneyFilter(uris)).toEqual(defaultJourneyFilter(uris));
  });
});

describe("personaMatchesCoordinate (the APPROXIMATE axis)", () => {
  it("matches everything when no persona is chosen", () => {
    expect(personaMatchesCoordinate(undefined, [])).toBe(true);
    expect(personaMatchesCoordinate(undefined, [`${DOCS}role.writer`])).toBe(
      true,
    );
  });

  it("matches by BARE TERM across the persona/role filing prefixes", () => {
    // `persona.writer` and `role.writer` are different URIs naming the
    // same word; the filing prefix is Turtle bookkeeping, not vocabulary.
    expect(
      personaMatchesCoordinate(`${DOCS}persona.writer`, [`${DOCS}role.writer`]),
    ).toBe(true);
    expect(
      personaMatchesCoordinate(`${DOCS}persona.architect`, [
        `${DOCS}role.writer`,
      ]),
    ).toBe(false);
  });

  it("treats an EMPTY role axis as the wildcard the ontology says it is", () => {
    // 26 of the 52 live jobs carry no role axis. The ontology reads that
    // as "any role", so such a coordinate genuinely serves every persona —
    // dimming it would be the lens contradicting the model.
    expect(personaMatchesCoordinate(`${DOCS}persona.agent`, [])).toBe(true);
    expect(personaMatchesCoordinate(`${DOCS}persona.designer`, [])).toBe(true);
  });

  it("states its approximation in text meant for the reader", () => {
    // The axis is not exact and the interface has to say so; this pins
    // that the confession exists and names the reason.
    expect(PERSONA_MATCH_NOTE).toContain("Approximate");
    expect(PERSONA_MATCH_NOTE).toContain("no persona-to-job edge");
  });
});

describe("personaTerm", () => {
  it("recovers the ontology's own word from the filed local name", () => {
    expect(personaTerm(`${DOCS}persona.architect`)).toBe("architect");
  });
});

describe("ALL_JOURNEYS_FILTER", () => {
  it("narrows nothing", () => {
    expect(ALL_JOURNEYS_FILTER).toEqual({
      coordinate: undefined,
      persona: undefined,
    });
  });
});
