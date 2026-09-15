/**
 * A client hydrating filters the server drew with facets draws the same
 * counts and range hints: the provider asks its source for the facets before
 * hydrating, as the server's did, so nothing the server drew is swapped and
 * no mismatch is recovered from.
 */

import {
  createArraySource,
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  type DataViewsSnapshot,
} from "@canonical/dataviews-core";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = {
  readonly id: string;
  readonly status: string;
  readonly cpu: number;
};

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
  ],
});

const rows: readonly Row[] = [
  { id: "a", status: "failed", cpu: 4 },
  { id: "b", status: "ready", cpu: 16 },
  { id: "c", status: "failed", cpu: 8 },
];

/** A provider over the rows, at a URL keeping the failed machines. */
const createFaceted = (snapshot?: DataViewsSnapshot) =>
  createDataViewsProvider({
    collection,
    source: createArraySource({ rows, collection }),
    location: createMemoryLocation({ href: "/machines?status=failed" }),
    facets: ["status", "cpu"],
    ...(snapshot === undefined ? {} : { snapshot }),
  });

/** The counts and hints a node's filters show, in document order. */
const listDescriptions = (node: ParentNode): readonly string[] =>
  [...node.querySelectorAll(".count, .hint")].map(
    (description) => description.textContent ?? "",
  );

describe("hydrating filters drawn with facets", () => {
  it("draws the counts and hints the server drew, with no mismatch", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const server = createFaceted();
    server.refresh();
    const markup = renderToString(
      <DataViews provider={server}>
        <DataViews.Filters />
      </DataViews>,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const drawn = listDescriptions(container);
    // Status lifted from its own facet; the cores range over failed machines.
    expect(drawn).toEqual(["2", "1", "Lowest: 4", "Highest: 8"]);

    const client = createFaceted(
      JSON.parse(JSON.stringify(server.readSnapshot())),
    );
    client.refresh();
    const recovered = vi.fn();
    await act(async () => {
      const root = hydrateRoot(
        container,
        <DataViews provider={client}>
          <DataViews.Filters />
        </DataViews>,
        { onRecoverableError: recovered },
      );
      onTestFinished(() => {
        act(() => {
          root.unmount();
        });
      });
    });
    expect(recovered).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(listDescriptions(container)).toEqual(drawn);
  });
});
