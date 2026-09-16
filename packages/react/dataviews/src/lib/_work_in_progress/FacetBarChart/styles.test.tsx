/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what
 * is pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the chart draws, the structure
 * its combinators assume is the one it draws, and every value is a token —
 * the bar's borrowed foreground included, since the design system has no
 * chart palette and the prototype invents none.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createFacetedFleet,
  createFacetedManual,
} from "../../../../testing/createFacetedProviders.js";
import FacetBarChart from "./FacetBarChart.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/** A file beside this one, as text. */
const read = (file: string): string =>
  readFileSync(path.join(here, file), "utf8");

// Comments and the layer name dropped, so neither prose nor `ds.components`
// is ever taken for a class selector; whitespace collapsed, so a rule is
// named by its selector list on one line.
const sheet = read("styles.css")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "")
  .replace(/\s+/g, " ");

/** The chart over a fleet its source counts. */
const mounted = (): HTMLElement => {
  const { container } = render(
    <FacetBarChart
      provider={createFacetedFleet()}
      field="status"
      label="Machines by status"
    />,
  );
  return container;
};

const root = ".ds.facet-bar-chart";

describe("FacetBarChart stylesheet", () => {
  it("styles only classes the chart draws", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name = ""]) => name),
    );
    const drawn = new Set(
      [...mounted().querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    );
    // The status is drawn in place of the bars, so it is collected apart.
    const { provider } = createFacetedManual();
    const pending = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    for (const element of pending.container.querySelectorAll("[class]")) {
      for (const name of element.classList) {
        drawn.add(name);
      }
    }
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !drawn.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    const container = mounted();
    for (const selector of [
      `${root} > .chart`,
      `${root} > .data`,
      `${root} .bar`,
      `${root} .grid-line`,
      `${root} .tick`,
      `${root} .label`,
      `${root} .value`,
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("styles the status the chart carries as an attribute", () => {
    expect(sheet).toMatch(/& > \.status \{/);
    const { provider } = createFacetedManual();
    const { container } = render(
      <FacetBarChart
        provider={provider}
        field="status"
        label="Machines by status"
      />,
    );
    expect(
      container.querySelector(`${root} > .status[data-status]`),
    ).not.toBeNull();
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });
});
