/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what
 * is pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the switch renders, the
 * structure its combinators assume is the one it renders, and every value is
 * a token or a channel.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RendererSwitch from "./RendererSwitch.js";
import type { RendererChoice } from "./types.js";

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

const renderers: readonly RendererChoice[] = [
  { id: "table", label: "Table", content: <p>the table</p> },
  { id: "cards", label: "Cards", content: <p>the cards</p> },
];

/** The switch over two renderers, once scripts have taken over. */
const mounted = (): HTMLElement => {
  const { container } = render(
    <RendererSwitch label="Show machines as" renderers={renderers} />,
  );
  return container;
};

describe("RendererSwitch stylesheet", () => {
  it("styles only classes the switch renders", () => {
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
    expect(
      container.querySelector(".ds.renderer-switch > .choice"),
    ).not.toBeNull();
  });

  it("themes the select through the form layer's channels", () => {
    expect(sheet).toMatch(
      /--form-input-height: var\(--density-line-height-effective\);/,
    );
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });
});
