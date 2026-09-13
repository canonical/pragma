/**
 * The stylesheet's contract with the markup, and the anatomy's with the DOM,
 * pinned as for the action bar: jsdom applies no CSS, so what is checked is
 * what a stylesheet change could break with every render still green.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDataViewsProvider,
  createSchema,
  type SavedView,
  type ViewStore,
} from "@canonical/dataviews-core";
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataViews from "../../Provider.js";
import Views from "./Views.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const read = (file: string): string =>
  readFileSync(path.join(here, file), "utf8");

const sheet = read("styles.css")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "")
  .replace(/\s+/g, " ");

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

const selectorOf = (dom: string): string =>
  dom.includes(" ")
    ? dom
        .split(" ")
        .map((name) => `.${name}`)
        .join("")
    : dom;

const view: SavedView = {
  id: "v1",
  name: "Failed",
  query: "as=table&status=failed",
  presentation: null,
  revision: 1,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

/** A store call this test never makes. */
const unused = () => Promise.reject(new Error("not used in this test"));

/** A store holding one view, answering at once. */
const store: ViewStore = {
  list: async () => ({ views: [view], unreadable: [] }),
  get: async () => ({ status: "found", view }),
  create: unused,
  update: unused,
  remove: unused,
  pin: unused,
  unpin: unused,
  readPresentation: async () => ({}),
  patchPresentation: unused,
  subscribe: () => () => {},
  dispose: () => {},
};

/** The control with a modified view open and one panel opened by `command`. */
const opened = async (command: "Save as…" | "Delete…"): Promise<Element> => {
  const provider = createDataViewsProvider({
    schema: createSchema([
      { field: "status", kind: "choices", options: ["failed", "running"] },
    ]),
    views: store,
  });
  const { container } = render(
    <DataViews provider={provider}>
      <Views />
    </DataViews>,
  );
  const control = within(container);
  await waitFor(() => {
    expect(control.getByRole("combobox")).toBeEnabled();
  });
  await act(async () => {
    await provider.views?.open(view.id);
  });
  act(() => {
    provider.fields.status.eq.set(["running"]);
  });
  fireEvent.click(control.getByRole("button", { name: command }));
  if (command === "Save as…") {
    fireEvent.submit(control.getByRole("form"));
    await control.findByText("A view needs a name.");
  }
  return container;
};

/** Both panels' renders, which between them show every part. */
const rendered = async (): Promise<readonly Element[]> => [
  await opened("Save as…"),
  await opened("Delete…"),
];

const root = ".ds.data-views-views";

describe("Views stylesheet", () => {
  it("styles only classes the control renders", async () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name]) => name),
    );
    const classes = new Set(
      (await rendered()).flatMap((container) =>
        [...container.querySelectorAll("[class]")].flatMap((element) => [
          ...element.classList,
        ]),
      ),
    );
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !classes.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", async () => {
    const containers = await rendered();
    for (const selector of [
      `${root} > .picker > .ds.input.select`,
      `${root} > .picker > .modified`,
      `${root} > .commands`,
      `${root} > .ds.data-views-views-name-form > .ds.input.text`,
      `${root} > .ds.data-views-views-name-form > .error`,
      `${root} > .ds.data-views-views-confirm`,
      `${root} > .notices`,
    ]) {
      expect(
        containers.some((container) => container.querySelector(selector)),
        selector,
      ).toBe(true);
    }
  });

  it("writes no length or colour of its own", () => {
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("themes its inputs through the form layer's channels, and colours its text", () => {
    const control = rule(root);
    expect(control).toMatch(
      /--form-input-height: var\(--density-line-height-effective\);/,
    );
    expect(control).toMatch(
      /--form-input-padding-block: var\(--dimension-050\);/,
    );
    expect(control).toMatch(
      /--form-input-padding-inline: var\(--dimension-100\);/,
    );
    expect(rule("& > .picker > .modified, & > .notices")).toMatch(
      /color: var\(--color-text-muted\);/,
    );
    expect(rule("& > .ds.data-views-views-name-form > .error")).toMatch(
      /color: var\(--color-text-error\);/,
    );
  });
});

describe("Views anatomy", () => {
  it("states only DOM the control renders", async () => {
    const anatomy = read("Views.anatomy.yaml");
    const stated = [...anatomy.matchAll(/DOM `([^`]+)`/g)]
      .map(([, dom]) => selectorOf(dom))
      // Rendered inside a `noscript`, so only without JavaScript.
      .filter((selector) => selector !== ".unavailable");
    expect(stated.length).toBeGreaterThan(0);
    const containers = await rendered();
    expect(
      stated.filter(
        (selector) =>
          !containers.some((container) => container.querySelector(selector)),
      ),
    ).toEqual([]);
  });
});
