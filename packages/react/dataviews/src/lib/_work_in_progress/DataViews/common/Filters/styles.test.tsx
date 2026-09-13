/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what
 * is pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the part renders, and the
 * baseline's submit control is hidden by the scripting media feature and
 * by nothing else.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import Filters from "./Filters.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Comments and the layer name dropped, so neither prose nor `ds.components`
// is ever taken for a class selector; whitespace collapsed, so a rule is
// named by its selector list on one line.
const sheet = readFileSync(path.join(here, "styles.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "")
  .replace(/\s+/g, " ");

/** The filters over the machine source. */
const mounted = (): HTMLElement => {
  const { provider } = createMachineProvider({ rows: [] });
  const { container } = render(
    <DataViews provider={provider}>
      <Filters />
    </DataViews>,
  );
  return container;
};

describe("Filters stylesheet", () => {
  it("styles only classes the part renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name = ""]) => name),
    );
    const rendered = new Set(
      [...mounted().querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    );
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    const container = mounted();
    for (const selector of [".ds.data-views-filters > .submit"]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("hides the submit control under scripting, and only there", () => {
    expect(sheet).toMatch(
      /\.ds\.data-views-filters \{ @media \(scripting: enabled\) \{ & > \.submit \{ display: none; \}/,
    );
    expect(sheet.match(/\.submit/g)).toHaveLength(1);
  });
});
