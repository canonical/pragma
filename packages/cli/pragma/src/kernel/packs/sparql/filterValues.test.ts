/**
 * One rejected filter value, ONE list of the values it should have been.
 *
 * `variable list --symbol nope` printed the 40-name head of a 745-name
 * vocabulary twice — once as the options line, once inside the recovery
 * message, about 1.4KB of duplicate terminal output. The vocabulary rides
 * `validOptions`, which every renderer already spells out, truncates and
 * counts; a recovery says what to DO.
 */

import { describe, expect, it } from "vitest";
import {
  type PragmaError,
  renderErrorLlm,
  renderErrorPlain,
} from "../../error/index.js";
import type { PackFilter } from "../types.js";
import { resolveFilterPredicates } from "./filterValues.js";

/** The 745-name catalogue that made the duplication measurable. */
const VOCABULARY = Array.from({ length: 745 }, (_, i) => `color.text.${i}`);

const FREE_FILTER: PackFilter = { param: "symbol", variable: "symbol" };
const SET_FILTER: PackFilter = {
  param: "type",
  variable: "type",
  values: ["color", "dimension", "duration"],
};

/** The error a filter raises for a value it does not admit. */
function rejection(
  filter: PackFilter,
  value: string | readonly string[],
  vocabulary?: readonly string[],
): PragmaError {
  try {
    resolveFilterPredicates(
      [filter],
      { [filter.param]: value },
      vocabulary ? new Map([[filter.param, vocabulary]]) : undefined,
      "test:story",
    );
  } catch (error) {
    return error as PragmaError;
  }
  throw new Error("the filter admitted a value it should have refused");
}

/** How many times `needle` appears in `text`. */
const occurrences = (text: string, needle: string): number =>
  text.split(needle).length - 1;

describe("a refused filter value names its vocabulary once", () => {
  it("renders the catalogue once, not twice", () => {
    const error = rejection(FREE_FILTER, "nope", VOCABULARY);
    const plain = renderErrorPlain(error);

    expect(occurrences(plain, "color.text.0,")).toBe(1);
    expect(plain).toContain("Valid options (745), first 40:");
    // The recovery says what to do, and names the flag — without the list.
    expect(plain).toContain(
      "Every --symbol value must be one of the 745 it accepts.",
    );
    expect(renderErrorLlm(error)).toContain("must be one of the 745");
    expect(occurrences(renderErrorLlm(error), "color.text.0,")).toBe(1);
  });

  it("keeps the whole vocabulary on the machine channel", () => {
    // Truncation is a RENDERING decision; a machine consumer loses nothing.
    expect(rejection(FREE_FILTER, "nope", VOCABULARY).validOptions).toEqual(
      [...VOCABULARY].sort(),
    );
  });

  it("says it once for a declared set too", () => {
    const plain = renderErrorPlain(rejection(SET_FILTER, "nope"));

    expect(occurrences(plain, "dimension")).toBe(1);
    expect(plain).toContain("Valid options: color, dimension, duration");
    expect(plain).toContain(
      "Every --type value must be one of the 3 it accepts.",
    );
  });

  it("a short vocabulary stays cheap to read", () => {
    const plain = renderErrorPlain(rejection(SET_FILTER, "nope"));

    expect(plain.length).toBeLessThan(200);
  });
});

describe("a filter handed several values", () => {
  it("admits them as one union predicate", () => {
    const predicates = resolveFilterPredicates(
      [SET_FILTER],
      { type: ["Color", "duration"] },
      undefined,
      "test:story",
    );

    expect(predicates).toEqual([
      { variable: "type", match: "exact", terms: ["color", "duration"] },
    ]);
  });

  it("names EVERY refused value, not just the first", () => {
    const error = rejection(
      FREE_FILTER,
      ["color.text.1", "nope", "color.text.2", "neither"],
      VOCABULARY,
    );

    expect(error.message).toBe('Invalid symbol "nope", "neither".');
  });

  it("names every refused value of a declared set", () => {
    const error = rejection(SET_FILTER, ["color", "nope", "neither"]);

    expect(error.message).toBe('Invalid type "nope", "neither".');
    expect(error.validOptions).toEqual(["color", "dimension", "duration"]);
  });
});
