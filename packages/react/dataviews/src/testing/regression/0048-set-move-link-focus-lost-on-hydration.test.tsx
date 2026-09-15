/**
 * Regression: a reader on a set's move link keeps focus as scripts take over.
 *
 * Before the fix, the server's link moving a standing set to the other set
 * operator was replaced by a button once the filters hydrated, and a reader
 * who had tabbed to the link in the meantime was left with focus on nothing,
 * as the header's link once left them. The button now takes the link's focus,
 * and only when the link held it.
 */

import {
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { act, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "status", kind: "choices", options: ["failed", "ready"] }],
});

const capabilities = declareCapabilities(collection, {
  filter: { status: ["isAny", "isNone"] },
});

/** The filters over a standing failed set, as a server and a client build them. */
const buildFilters = () => (
  <DataViews
    provider={createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities }).source,
      location: createMemoryLocation({ href: "/machines?status=failed" }),
    })}
  >
    <DataViews.Filters />
  </DataViews>
);

/** Draw the server's markup into the document, and the link it rendered. */
const drawServerMarkup = (): {
  readonly container: HTMLDivElement;
  readonly link: HTMLAnchorElement;
} => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(buildFilters());
  document.body.append(container);
  onTestFinished(() => {
    container.remove();
  });
  const link = container.querySelector("a.switch");
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error("the server rendered no move link");
  }
  return { container, link };
};

/** Hydrate the server's markup, unmounting once the test finishes. */
const hydrate = async (container: HTMLDivElement): Promise<void> => {
  const root = await act(async () => hydrateRoot(container, buildFilters()));
  onTestFinished(() => {
    act(() => {
      root.unmount();
    });
  });
};

describe("regression 0048 — a set move link's focus lost on hydration", () => {
  it("hands the link's focus to the button that replaces it", async () => {
    const { container, link } = drawServerMarkup();
    link.focus();
    await hydrate(container);
    expect(document.activeElement).toBe(
      within(container).getByRole("button", {
        name: "Match none of these instead",
      }),
    );
  });

  it("leaves focus where it was when the link did not hold it", async () => {
    const { container } = drawServerMarkup();
    const before = document.activeElement;
    await hydrate(container);
    expect(document.activeElement).toBe(before);
  });
});
