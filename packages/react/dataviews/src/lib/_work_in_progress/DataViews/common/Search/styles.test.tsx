/**
 * The stylesheet's contract with the markup, and the anatomy's with the DOM.
 * jsdom applies no CSS, so what is pinned is what a stylesheet change can
 * break with every render still green: each class the sheet styles is one
 * the part renders, the structure its combinators assume is the one it
 * renders, every value is a token or a channel, and the baseline's submit
 * control is hidden by the scripting media feature and by nothing else.
 *
 * The anatomy beside the code states the DOM the part renders; the same
 * render pins that it still does. This reads the anatomy's notes, not its
 * structure: it is no validator.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import Search from "./Search.js";

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

/**
 * An anatomy note's DOM as a selector: a class list (`ds data-views-search`)
 * or a selector already (`.input`, `input[type=search]`), the first of a
 * comma-separated pair.
 */
const selectorOf = (dom: string): string => {
  const [first = ""] = dom.split(", ");
  return first.includes(" ") && !first.includes("[") && !first.includes("`")
    ? first
        .split(" ")
        .map((name) => `.${name}`)
        .join("")
    : first;
};

/** A search part over a source that searches. */
const mounted = (): HTMLElement => {
  const { provider } = createMachineProvider({ rows: [] });
  const { container } = render(
    <DataViews provider={provider}>
      <Search />
    </DataViews>,
  );
  return container;
};

const root = ".ds.data-views-search";

describe("Search stylesheet", () => {
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
    for (const selector of [`${root} > .input`, `${root} > .submit`]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("hides the submit control under scripting, and only there", () => {
    // The control is the baseline's way to search: it must be there until
    // scripting is enabled, and gone once every edit applies as typed.
    expect(sheet).toMatch(
      /@media \(scripting: enabled\) \{ & > \.submit \{ display: none; \}/,
    );
    expect(sheet.match(/\.submit/g)).toHaveLength(1);
  });

  it("themes the input through the form layer's channels", () => {
    expect(sheet).toMatch(
      /--form-input-height: var\(--density-line-height-effective\);/,
    );
    expect(sheet).toMatch(
      /& > \.input \{[^}]*block-size: var\(--form-input-height\);/,
    );
  });
});

describe("Search anatomy", () => {
  const anatomy = read("Search.anatomy.yaml");

  it("is implemented by the component beside it", () => {
    const uri = anatomy.match(/^node:\n\s+uri: (\S+)$/m)?.[1] ?? "";
    expect(uri).toBe("global.subcomponent.search_input");
    expect(read("Search.tsx")).toMatch(
      /@implements ds:global\.subcomponent\.search_input(?![\w.-])/,
    );
  });

  it("states only DOM the part renders", () => {
    const stated = [...anatomy.matchAll(/DOM `([^`]+)`/g)].map(([, dom = ""]) =>
      selectorOf(dom),
    );
    expect(stated.length).toBeGreaterThan(0);
    const container = mounted();
    expect(
      stated.filter((selector) => container.querySelector(selector) === null),
    ).toEqual([]);
    // The input is the native search input the anatomy names.
    expect(container.querySelector("input[type=search]")).toHaveClass("input");
  });
});
