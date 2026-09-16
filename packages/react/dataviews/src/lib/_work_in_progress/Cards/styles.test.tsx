/**
 * The stylesheet's contract with the markup, and the anatomy's with the DOM.
 * jsdom applies no CSS, so what is pinned is what a stylesheet change can
 * break with every render still green: each class the sheet styles is one
 * the cards render, the structure its combinators assume is the one they
 * render, and every value is a token.
 *
 * The anatomy beside the code states the DOM the cards render; the same
 * render pins that they still do. This reads the anatomy's notes, not its
 * structure: it is no validator.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../testing/machines.js";
import type { DisplayField } from "../../common/index.js";
import Cards from "./Cards.js";

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

const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
];

/** Cards whose source has not answered: the status stands in their place. */
const pending = (): HTMLElement => {
  const { provider } = createMachineProvider();
  const { container } = render(
    <Cards
      provider={provider}
      fields={fields}
      title="name"
      label="Machines"
      selectable
    />,
  );
  return container;
};

/** Every class the cards render, over rows and over a status alike. */
const everyRenderedClass = (): ReadonlySet<string> =>
  new Set(
    [mounted(), pending()].flatMap((container) =>
      [...container.querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    ),
  );

/** Selectable cards over two machines. */
const mounted = (): HTMLElement => {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha"), machine("m-2", "beta")],
  });
  const { container } = render(
    <Cards
      provider={provider}
      fields={fields}
      title="name"
      label="Machines"
      selectable
    />,
  );
  return container;
};

const root = ".ds.data-cards";

describe("Cards stylesheet", () => {
  it("styles only classes the cards render", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name = ""]) => name),
    );
    const rendered = everyRenderedClass();
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    const container = mounted();
    for (const selector of [
      `${root} > .select-all`,
      `${root} .data-card > .header`,
      `${root} .data-card .fields`,
      `${root} .data-card .field`,
      `${root} .data-card .title`,
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("styles the status the cards carry as an attribute", () => {
    // The status stands in place of the cards, or above them, and the sheet
    // selects it where the renderer draws it.
    expect(sheet).toMatch(/& > \.status \{/);
    const { provider } = createMachineProvider();
    const { container } = render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
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

describe("Cards anatomy", () => {
  const anatomy = read("Cards.anatomy.yaml");

  it("is implemented by the component beside it", () => {
    expect(anatomy).toContain("ref: ds:global.group.cards");
    expect(read("Cards.tsx")).toMatch(
      /@implements ds:global\.group\.cards(?![\w.-])/,
    );
  });

  it("states only DOM the cards render", () => {
    const stated = [...anatomy.matchAll(/DOM `\.([a-z][\w-]*)`/g)].map(
      ([, name = ""]) => name,
    );
    expect(stated.length).toBeGreaterThan(0);
    const rendered = everyRenderedClass();
    expect(stated.filter((name) => !rendered.has(name))).toEqual([]);
  });
});
