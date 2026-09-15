/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what
 * is pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the control renders, and the
 * clear control appears under the scripting media feature and nowhere else.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { declareCapabilities } from "@canonical/dataviews-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machines,
} from "../../../../../../../../testing/machines.js";
import DataViews from "../../../../Provider.js";
import Filters from "../../Filters.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Comments and the layer name dropped, so neither prose nor `ds.components`
// is ever taken for a class selector; whitespace collapsed, so a rule is
// named by its selector list on one line.
const sheet = readFileSync(path.join(here, "styles.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "")
  .replace(/\s+/g, " ");

/** A text filter with text applied, so its clear control renders. */
const mountTextFilter = (): HTMLElement => {
  const { provider } = createMachineProvider({
    rows: [],
    capabilities: declareCapabilities(machines, {
      filter: { name: ["contains"] },
    }),
  });
  const { container } = render(
    <DataViews provider={provider}>
      <Filters />
    </DataViews>,
  );
  fireEvent.change(screen.getByLabelText("name contains"), {
    target: { value: "web" },
  });
  const text = container.querySelector(".ds.data-views-filters-text");
  if (text === null) {
    throw new Error("expected a text filter");
  }
  return text as HTMLElement;
};

describe("TextFilter stylesheet", () => {
  it("styles only classes the control renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name = ""]) => name),
    );
    const text = mountTextFilter();
    const rendered = new Set(
      [text, ...text.querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    );
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    expect(mountTextFilter().querySelector(":scope > .clear")).not.toBeNull();
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("shows the clear control under scripting, and only there", () => {
    expect(sheet).toMatch(
      /\.ds\.data-views-filters-text \{ & > \.clear \{ display: none; \} @media \(scripting: enabled\) \{ & > \.clear \{ display: inline-flex; \}/,
    );
    expect(sheet.match(/\.clear/g)).toHaveLength(2);
  });
});
