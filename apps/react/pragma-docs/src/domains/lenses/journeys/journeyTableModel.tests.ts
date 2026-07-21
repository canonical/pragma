/**
 * The table's model, pinned as PURE — the `buildJourneyGraph` precedent
 * applied to ORDER rather than to positions.
 *
 * Why this matters as much as the layout's determinism does: the default
 * sort and grouping are applied on the SERVER, and the client's first
 * render must reproduce them byte for byte or React 19 reports a hydration
 * mismatch (which a `console.error` spy does NOT catch). A comparator that
 * consulted anything outside its arguments — a clock, a locale read at
 * call time, the input array's order — would break that silently. So the
 * pins below are equality-of-serialisation arguments, the same shape the
 * definitions explorer's filter uses.
 */

import { describe, expect, it } from "vitest";
import type { JourneyCoordinate } from "./JourneyWell/buildJourneyGraph.js";
import {
  ariaSortFor,
  axisText,
  buildJourneyRows,
  compareRows,
  DEFAULT_TABLE_STATE,
  groupRows,
  type JourneyTableState,
  sortRows,
  toggleSort,
} from "./journeyTableModel.js";

/** A small model with the shapes that matter: a served job with two
 * pairings (one primary), an unserved job, a wildcard-axis job, and two
 * coordinates so grouping has something to group. */
const COORDINATES: readonly JourneyCoordinate[] = [
  {
    uri: "sem://docs#coord.b",
    label: "designer × architect × fluent",
    jobs: [
      {
        uri: "sem://docs#job.zebra",
        label: "job.zebra",
        pairings: [
          {
            uri: "sem://docs#pair.1",
            label: "pair.1",
            role: "sem://docs#role.primary",
            surface: {
              uri: "sem://docs#view.components",
              label: "view.components",
              href: "/components",
            },
          },
          {
            uri: "sem://docs#pair.2",
            label: "pair.2",
            role: "sem://docs#role.secondary",
            surface: { uri: "sem://docs#view.zzz", label: "view.zzz" },
          },
        ],
      },
    ],
  },
  {
    uri: "sem://docs#coord.a",
    label: "any actor × any role × any fluency",
    jobs: [
      { uri: "sem://docs#job.alpha", label: "job.alpha", pairings: [] },
      {
        uri: "sem://docs#job.mid",
        label: "job.mid",
        pairings: [
          {
            uri: "sem://docs#pair.3",
            label: "pair.3",
            role: "sem://docs#role.primary",
            surface: {
              uri: "sem://docs#view.home",
              label: "view.home",
              href: "/",
            },
          },
        ],
      },
    ],
  },
];

const DETAIL = {
  "sem://docs#job.zebra": {
    story: "I want to browse the catalog",
    acceptances: ["the list filters", "the count is honest"],
    roles: ["sem://docs#role.architect"],
    fluencies: ["sem://docs#fluency.fluent"],
  },
  "sem://docs#job.alpha": { story: "I want something nothing serves" },
  "sem://docs#job.mid": { roles: ["sem://docs#role.writer"] },
};

const rows = buildJourneyRows(COORDINATES, DETAIL);
const labels = (input: readonly { readonly label: string }[]): string[] =>
  input.map((row) => row.label);

describe("buildJourneyRows projects the model honestly", () => {
  it("emits one row per job, with the columns the table shows", () => {
    expect(rows).toHaveLength(3);
    const zebra = rows.find((row) => row.label === "job.zebra");
    expect(zebra?.story).toBe("I want to browse the catalog");
    expect(zebra?.acceptances).toHaveLength(2);
    expect(zebra?.coordinateLabel).toBe("designer × architect × fluent");
    // Pairing counts are COUNTED from the graph's own role terms, never
    // inferred from position.
    expect(zebra?.pairings).toHaveLength(2);
    expect(zebra?.primaryCount).toBe(1);
    expect(zebra?.secondaryCount).toBe(1);
    // The reported surface is the first by URI order — deterministic,
    // never the graph's iteration order.
    expect(zebra?.surfaceLabel).toBe("view.components");
    expect(zebra?.surfaceHref).toBe("/components");
    expect(zebra?.served).toBe(true);
  });

  it("reports an unserved job as unserved, with no invented surface", () => {
    const alpha = rows.find((row) => row.label === "job.alpha");
    expect(alpha?.served).toBe(false);
    expect(alpha?.pairings).toHaveLength(0);
    expect(alpha?.surfaceLabel).toBeUndefined();
    expect(alpha?.surfaceHref).toBeUndefined();
  });

  it("renders an unconstrained axis as the ontology's wildcard, not a gap", () => {
    // The ontology reads an absent axis as "matches anything". Saying
    // "any" reports the data; saying "none" or leaving it blank would
    // misreport it.
    const alpha = rows.find((row) => row.label === "job.alpha");
    expect(alpha?.roles).toHaveLength(0);
    expect(axisText(alpha?.roles ?? [])).toBe("any");
    // …and a constrained axis reads as its bare term (filing prefix off).
    const zebra = rows.find((row) => row.label === "job.zebra");
    expect(axisText(zebra?.roles ?? [])).toBe("architect");
  });
});

describe("the comparators are pure and total", () => {
  it("is byte-equal for equal input, called twice", () => {
    // The determinism pin: same input, byte-equal output. This is what
    // lets the server apply the default sort and the client reproduce it.
    const once = JSON.stringify(sortRows(rows, "job", "ascending"));
    const twice = JSON.stringify(sortRows(rows, "job", "ascending"));
    expect(once).toBe(twice);
  });

  it("does not depend on the INPUT order — the graph's iteration order cannot leak", () => {
    // The property a tie-carrying comparator would fail. `sort` is stable,
    // so ties would make the output echo the input; a total order cannot.
    const forward = sortRows(rows, "job", "ascending");
    const reversed = sortRows([...rows].reverse(), "job", "ascending");
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
    // …and on a column where several rows genuinely tie on the primary
    // key (state), the URI tiebreak still yields one fixed order.
    expect(JSON.stringify(sortRows(rows, "served", "ascending"))).toBe(
      JSON.stringify(sortRows([...rows].reverse(), "served", "ascending")),
    );
  });

  it("never returns 0 for two distinct rows (the order is total)", () => {
    const compare = compareRows("served", "ascending");
    for (const left of rows) {
      for (const right of rows) {
        if (left.uri === right.uri) continue;
        expect(compare(left, right)).not.toBe(0);
      }
    }
  });

  it("orders by each column, and descending is the exact mirror", () => {
    expect(labels(sortRows(rows, "job", "ascending"))).toEqual([
      "job.alpha",
      "job.mid",
      "job.zebra",
    ]);
    expect(labels(sortRows(rows, "job", "descending"))).toEqual([
      "job.zebra",
      "job.mid",
      "job.alpha",
    ]);
    // Numeric columns compare numerically, not lexically.
    expect(labels(sortRows(rows, "pairings", "descending"))).toEqual([
      "job.zebra",
      "job.mid",
      "job.alpha",
    ]);
    // Unserved sorts to one end, which is the reading a state sort wants.
    expect(labels(sortRows(rows, "served", "ascending")).at(0)).toBe(
      "job.alpha",
    );
  });

  it("does not mutate its input", () => {
    const before = JSON.stringify(rows);
    sortRows(rows, "pairings", "descending");
    groupRows(rows, DEFAULT_TABLE_STATE);
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("grouping arranges without losing rows", () => {
  it("groups by coordinate, and every row survives exactly once", () => {
    const groups = groupRows(rows, DEFAULT_TABLE_STATE);
    expect(groups).toHaveLength(2);
    const total = groups.flatMap((group) => group.rows);
    expect(total).toHaveLength(rows.length);
    expect(new Set(total.map((row) => row.uri)).size).toBe(rows.length);
  });

  it("groups by state into served and unserved", () => {
    const groups = groupRows(rows, { ...DEFAULT_TABLE_STATE, group: "served" });
    expect(groups.map((group) => group.label).sort()).toEqual([
      "Served",
      "Unserved",
    ]);
    const unserved = groups.find((group) => group.label === "Unserved");
    expect(labels(unserved?.rows ?? [])).toEqual(["job.alpha"]);
  });

  it("groups by role, filing the wildcard under 'any' rather than a persona", () => {
    // The approximation stays visible: a job with no role axis is not
    // silently assigned to some persona it never claimed.
    const groups = groupRows(rows, { ...DEFAULT_TABLE_STATE, group: "role" });
    expect(groups.map((group) => group.label).sort()).toEqual([
      "any",
      "architect",
      "writer",
    ]);
  });

  it("flat grouping yields exactly one group holding every row", () => {
    const groups = groupRows(rows, { ...DEFAULT_TABLE_STATE, group: "none" });
    expect(groups).toHaveLength(1);
    expect(groups.at(0)?.rows).toHaveLength(rows.length);
  });

  it("is byte-equal for equal input (the SSR pin, for grouping too)", () => {
    const once = JSON.stringify(groupRows(rows, DEFAULT_TABLE_STATE));
    const twice = JSON.stringify(groupRows(rows, DEFAULT_TABLE_STATE));
    expect(once).toBe(twice);
  });
});

describe("the header controls' state algebra", () => {
  it("marks aria-sort on the ACTIVE column only", () => {
    // WAI-ARIA permits at most one column to claim a direction, and
    // deriving it (rather than storing per column) makes that structural.
    expect(ariaSortFor("job", DEFAULT_TABLE_STATE)).toBe("ascending");
    expect(ariaSortFor("coordinate", DEFAULT_TABLE_STATE)).toBe("none");
    expect(ariaSortFor("pairings", DEFAULT_TABLE_STATE)).toBe("none");
  });

  it("toggles direction on the same column and resets on a new one", () => {
    const flipped = toggleSort(DEFAULT_TABLE_STATE, "job");
    expect(flipped.direction).toBe("descending");
    expect(toggleSort(flipped, "job").direction).toBe("ascending");
    const moved: JourneyTableState = toggleSort(flipped, "pairings");
    expect(moved.sort).toBe("pairings");
    expect(moved.direction).toBe("ascending");
    // Grouping is orthogonal — sorting never disturbs it.
    expect(moved.group).toBe(DEFAULT_TABLE_STATE.group);
  });

  it("the DEFAULT is a constant, which is the strongest determinism claim", () => {
    // Not a computation over data: there is nothing for the server and
    // the client to disagree about.
    expect(DEFAULT_TABLE_STATE).toEqual({
      sort: "job",
      direction: "ascending",
      group: "coordinate",
    });
  });
});
