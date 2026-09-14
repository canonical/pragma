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
import { createPage } from "@canonical/dataviews-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../testing/machines.js";
import PaginationBar from "./PaginationBar.js";

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
 * (`.page-size`).
 */
const selectorOf = (dom: string): string =>
  dom.includes(" ")
    ? dom
        .split(" ")
        .filter((name) => !name.startsWith("<"))
        .map((name) => `.${name}`)
        .join("")
    : dom;

/** Two of three rows, counted exactly, as a source delivers them. */
const twoOfThree = createPage({
  rows: [machine("m1", "one"), machine("m2", "two")],
  matched: 3,
  total: 3,
});

/**
 * A bar over two pages of results, the page total showing. The bar
 * observes its provider on mount, so the source's request exists once it
 * has rendered, and is answered then.
 */
const loaded = (): HTMLElement => {
  const { provider, source } = createMachineProvider({
    snapshot: { query: "page=1&size=2", presentation: {} },
  });
  const { container } = render(<PaginationBar provider={provider} />);
  act(() => {
    source.latest().deliver({ status: "succeeded", page: twoOfThree });
  });
  return container;
};

const bar = ".ds.data-table-pagination-bar";
const navigation = "& > .trailing > .navigation";

describe("PaginationBar stylesheet", () => {
  it("styles only classes the bar renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name = ""]) => name),
    );
    const rendered = new Set(
      [...loaded().querySelectorAll("[class]")].flatMap((element) => [
        ...element.classList,
      ]),
    );
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    // Every class appearing somewhere is not enough: the sheet reaches each
    // part through its parent, and a part that moves loses its rule.
    const container = loaded();
    for (const selector of [
      `${bar} > .leading > .page-size > .ds.input.select`,
      `${bar} > .leading > .divider`,
      `${bar} > .leading > .summary`,
      `${bar} > .trailing > .page > .ds.input.select`,
      `${bar} > .trailing > .page > .total`,
      `${bar} > .trailing > .divider`,
      `${bar} > .trailing > .navigation > .ds.button`,
      `${bar} > .trailing > .navigation > .first > .icon`,
      `${bar} > .trailing > .navigation > .last > .icon`,
      `${bar} > .leading > .page-size > .submit`,
      `${bar} > .trailing > .page > .submit`,
      `${bar} > .trailing > .navigation > .scripted`,
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  it("hides the baseline's submit controls under scripting, and the scripted controls until then", () => {
    // The submit controls are the GET forms' way to page before any script
    // runs; the page controls with no destination are the enhancement's.
    expect(rule(`${navigation} > .scripted`)).toMatch(/display: none;/);
    expect(sheet).toMatch(
      /@media \(scripting: enabled\) \{ & > \.leading > \.page-size > \.submit, & > \.trailing > \.page > \.submit \{ display: none; \} & > \.trailing > \.navigation > \.scripted \{ display: inline-flex; \}/,
    );
    expect(sheet.match(/\.submit/g)).toHaveLength(2);
  });

  it("writes no length or colour of its own", () => {
    // Every value is a token, a channel or a structural keyword: a missing
    // token is recorded in the anatomy, never written here as a number.
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("binds every component token to a design token or a channel, and reads each", () => {
    // The bar's own tier: a token per design decision, each bound to the
    // design system's tokens or to a channel of @canonical/styles, and each
    // read by a rule — a token nothing reads is a decision nobody made. The
    // static bindings sit on the root scope; the four that read a channel
    // sit on the bar, where the channel is set, so they follow the nearest
    // density and surface rather than freezing at the root.
    const binding = /(--data-table-pagination-bar-[\w-]+): (var\([^;]*\));/g;
    const atRoot = [...rule(":root").matchAll(binding)].map(
      ([, token = "", value = ""]) => [token, value] as const,
    );
    const onBar = [...rule(bar).matchAll(binding)].map(
      ([, token = "", value = ""]) => [token, value] as const,
    );
    expect(atRoot.length).toBeGreaterThan(0);
    for (const [token, value] of atRoot) {
      expect(value, token).toMatch(/^var\( ?--(dimension|color|typography)-/);
    }
    expect(onBar.map(([token]) => token).sort()).toEqual([
      "--data-table-pagination-bar-color-background",
      "--data-table-pagination-bar-color-text",
      "--data-table-pagination-bar-control-size",
      "--data-table-pagination-bar-padding-inline-start",
    ]);
    for (const [token, value] of onBar) {
      expect(value, token).toMatch(/^var\( ?--(density|surface)-/);
    }
    // A long token wraps inside its `var()`; read them all without the space.
    const rules = sheet
      .slice(sheet.indexOf(bar))
      .replaceAll("var( ", "var(")
      .replaceAll(" )", ")");
    for (const [token] of [...atRoot, ...onBar]) {
      expect(rules, token).toContain(`var(${token})`);
    }
    // And no rule reaches past its tier to a token the bar did not bind,
    // but for the two channels it themes the design system's parts through.
    const read = [...rules.matchAll(/var\((--[\w-]+)/g)].map(
      ([, token = ""]) => token,
    );
    expect(
      read.filter(
        (token) =>
          !token.startsWith("--data-table-pagination-bar-") &&
          !token.startsWith("--form-input-") &&
          !token.startsWith("--button-"),
      ),
    ).toEqual([
      // The bar's own channel bindings, then the select's tokens, set from
      // the design's values directly: the form layer's tier, not this bar's.
      "--density-padding-inline",
      "--density-line-height-effective",
      "--surface-color-text",
      "--color-text",
      "--surface-color-background",
      "--color-background",
      "--dimension-050",
      "--dimension-100",
      "--color-foreground-ghost",
    ]);
  });

  it("holds to the bottom of what scrolls it, on the surface it covers", () => {
    const root = rule(bar);
    expect(root).toMatch(/position: sticky;/);
    expect(root).toMatch(/inset-block-end: 0;/);
    expect(root).toMatch(
      /background-color: var\(--data-table-pagination-bar-color-background\);/,
    );
    expect(root).toMatch(
      /--data-table-pagination-bar-color-background: var\( ?--surface-color-background, var\(--color-background\) ?\);/,
    );
    expect(root).toMatch(
      /border-block-start: var\(--data-table-pagination-bar-border-width\) solid var\(--data-table-pagination-bar-border-color\);/,
    );
    expect(root).toMatch(
      /padding-inline-start: var\(--data-table-pagination-bar-padding-inline-start\);/,
    );
    expect(root).toMatch(
      /--data-table-pagination-bar-padding-inline-start: var\( ?--density-padding-inline ?\);/,
    );
  });

  it("themes the design system's select through its own tokens", () => {
    const root = rule(bar);
    for (const declaration of [
      /--form-input-height: var\(--data-table-pagination-bar-control-size\);/,
      /--form-input-padding-block: var\(--dimension-050\);/,
      /--form-input-padding-inline: var\(--dimension-100\);/,
      /--form-input-background: var\(--color-foreground-ghost\);/,
      /--form-input-border-color: transparent;/,
    ]) {
      expect(root).toMatch(declaration);
    }
    // The one property overridden rather than themed.
    expect(
      rule(
        "& > .leading > .page-size > .ds.input.select, & > .trailing > .page > .ds.input.select",
      ),
    ).toMatch(/inline-size: auto;/);
  });

  it("holds each icon-only button to a square of the density line", () => {
    // Left to the Button, an icon-only one is shorter than the minimum target.
    const button = rule(`${navigation} > .ds.button`);
    expect(button).toMatch(
      /--button-padding-inline-end: var\( ?--data-table-pagination-bar-control-padding-inline-end ?\);/,
    );
    expect(button).toMatch(
      /min-block-size: var\(--data-table-pagination-bar-control-size\);/,
    );
    expect(button).toMatch(
      /min-inline-size: var\(--data-table-pagination-bar-control-size\);/,
    );
    expect(rule(bar)).toMatch(
      /--data-table-pagination-bar-control-size: var\( ?--density-line-height-effective ?\);/,
    );
    expect(button).toMatch(/align-items: center;/);
    expect(button).toMatch(/justify-content: center;/);
  });

  it("turns the interim first and last icons towards their edges", () => {
    // Through the control's own icon slot, a child, never down into the
    // Icon component's class.
    expect(rule(`${navigation} > .first > .icon`)).toMatch(/rotate: -90deg;/);
    expect(rule(`${navigation} > .last > .icon`)).toMatch(/rotate: 90deg;/);
    expect(sheet).not.toMatch(/\.ds\.icon/);
  });

  it("draws the design's dividers", () => {
    const divider = rule("& > .leading > .divider, & > .trailing > .divider");
    expect(divider).toMatch(
      /inline-size: var\(--data-table-pagination-bar-divider-inline-size\);/,
    );
    expect(divider).toMatch(
      /block-size: var\(--data-table-pagination-bar-divider-block-size\);/,
    );
    expect(rule(":root")).toMatch(
      /--data-table-pagination-bar-divider-block-size: var\(--dimension-300\);/,
    );
  });
});

describe("PaginationBar anatomy", () => {
  const anatomy = read("PaginationBar.anatomy.yaml");

  it("is implemented by the component beside it", () => {
    const uri = anatomy.match(/^node:\n\s+uri: (\S+)$/m)?.[1] ?? "";
    expect(uri).toBe("apps.subcomponent.data_table-pagination_bar");
    expect(read("PaginationBar.tsx")).toMatch(
      /@implements ds:apps\.subcomponent\.data_table-pagination_bar(?![\w.-])/,
    );
  });

  it("states only DOM the bar renders", () => {
    const stated = [...anatomy.matchAll(/DOM `([^`]+)`/g)].map(([, dom = ""]) =>
      selectorOf(dom),
    );
    expect(stated.length).toBeGreaterThan(0);
    const container = loaded();
    expect(
      stated.filter((selector) => container.querySelector(selector) === null),
    ).toEqual([]);
  });

  it("names its four page controls as the DOM classes them", () => {
    loaded();
    for (const [name, destination] of [
      ["first", "First page"],
      ["previous", "Previous page"],
      ["next", "Next page"],
      ["last", "Last page"],
    ] as const) {
      expect(anatomy).toMatch(new RegExp(`slotName: ${name}$`, "m"));
      expect(anatomy).toMatch(new RegExp(`DOM \`\\.${name}\``));
      expect(screen.getByRole("button", { name: destination })).toHaveClass(
        name,
      );
    }
  });
});
