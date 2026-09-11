/**
 * The stylesheet's contract with the markup, and the anatomy's with the DOM.
 * jsdom applies no CSS, so what is pinned is what a stylesheet change can
 * break with every render still green: each class the sheet styles is one the
 * bar renders, the structure its combinators assume is the one it renders,
 * every value is a token or a channel, and the declarations whose loss no
 * render would show are still declared.
 *
 * The anatomy beside the code states the DOM each part renders; the same
 * renders pin that it still does. This reads the anatomy's notes, not its
 * structure: it is no validator.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataViews from "../../Provider.js";
import Actions from "./Actions.js";

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
 * The declarations of the rule whose selector list is exactly `selector`,
 * up to its first nested rule: anchored at a rule's start, so a longer
 * selector ending the same way never answers for it.
 */
const rule = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
  const body = sheet.match(
    new RegExp(`(?:^|[;{}]) ?${escaped} ?\\{([^{}]*)`),
  )?.[1];
  if (body === undefined) {
    throw new Error(`no rule for ${selector}`);
  }
  return body;
};

/**
 * An anatomy note's DOM as a selector: a class list (`ds data-table-row
 * status`, placeholders like `<kind>` dropped) or a selector already
 * (`.indicator`).
 */
const selectorOf = (dom: string): string =>
  dom.includes(" ")
    ? dom
        .split(" ")
        .filter((name) => !name.startsWith("<"))
        .map((name) => `.${name}`)
        .join("")
    : dom;

/** An action bar over a selection of two. */
const selected = (): HTMLElement => {
  const schema = createSchema([
    { field: "status", kind: "choices", options: ["failed", "ready"] },
  ]);
  const provider = createDataViewsProvider({ schema });
  const { container } = render(
    <DataViews provider={provider}>
      <Actions />
    </DataViews>,
  );
  act(() => {
    provider.selection.add(["m1", "m2"]);
  });
  return container;
};

const bar = ".ds.data-table-action-bar";

describe("Actions stylesheet", () => {
  it("styles only classes the bar renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name]) => name),
    );
    const rendered = new Set(
      [...selected().querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    );
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    // Every class appearing somewhere is not enough: the sheet reaches each
    // part through the bar, and a part that moves loses its rule.
    const container = selected();
    for (const selector of [
      `${bar}.contrasted > .indicator`,
      `${bar} > .ds.button.deselect`,
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("writes no length or colour of its own", () => {
    // Every value is a token, a channel or a structural keyword: a missing
    // token is recorded in the anatomy, never written here as a number.
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("paints the contrasted surface's channel, and hands its text to the Button", () => {
    const root = rule(bar);
    expect(root).toMatch(
      /background-color: var\(--surface-color-background, var\(--color-background\)\);/,
    );
    expect(root).toMatch(
      /[;{ ]color: var\(--surface-color-text, var\(--color-text\)\);/,
    );
    expect(root).toMatch(
      /--button-color-text: var\(--surface-color-text, var\(--color-text\)\);/,
    );
  });

  it("holds the icon-only deselect to a square of the density line", () => {
    // Left to the Button, an icon-only one is shorter than the minimum target.
    const deselect = rule("& > .ds.button.deselect");
    expect(deselect).toMatch(
      /min-block-size: var\(--density-line-height-effective\);/,
    );
    expect(deselect).toMatch(
      /min-inline-size: var\(--density-line-height-effective\);/,
    );
    expect(deselect).toMatch(
      /--button-padding-inline-end: var\(--dimension-100\);/,
    );
    expect(deselect).toMatch(/align-items: center;/);
    expect(deselect).toMatch(/justify-content: center;/);
  });

  it("insets the indicator by the density channel", () => {
    expect(rule("& > .indicator")).toMatch(
      /padding-inline: var\(--density-padding-inline\);/,
    );
  });
});

describe("Actions anatomy", () => {
  const anatomy = read("Actions.anatomy.yaml");

  it("is implemented by the component beside it", () => {
    const uri = anatomy.match(/^node:\n\s+uri: (\S+)$/m)?.[1] ?? "";
    expect(uri).toBe("apps.subcomponent.data_table-action_bar");
    expect(read("Actions.tsx")).toMatch(
      /@implements ds:apps\.subcomponent\.data_table-action_bar(?![\w.-])/,
    );
  });

  it("states only DOM the bar renders", () => {
    const stated = [...anatomy.matchAll(/DOM `([^`]+)`/g)].map(([, dom]) =>
      selectorOf(dom),
    );
    expect(stated.length).toBeGreaterThan(0);
    const container = selected();
    expect(
      stated.filter((selector) => container.querySelector(selector) === null),
    ).toEqual([]);
  });
});
