/**
 * Regression: without scripts, the sort panel still reorders and removes.
 *
 * Before the fix, the server render of the panel listed the terms and
 * offered nothing to act with, and no other no-script path led to an
 * ordering of several terms: a reader with scripts off could not put a
 * later term first, or take one out, anywhere on the page.
 */

import { createMemoryLocation, decodeQuery } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
  machines,
} from "../../../testing/machines.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0025 — the sort panel offered no path without scripts", () => {
  it("links a later term's move up to the ordering with it first", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
      location: createMemoryLocation({ href: "/machines" }),
    });
    provider.setSort([
      { field: "status", direction: "asc" },
      { field: "cores", direction: "desc" },
    ]);
    const markup = renderToString(
      <DataViews provider={provider}>
        <DataViews.SortPanel />
      </DataViews>,
    );
    const href = markup
      .match(/<a href="\?([^"]*)"[^>]*data-control="cores:up"/)
      ?.at(1);
    expect(href).toBeDefined();
    const params = new URLSearchParams((href ?? "").replaceAll("&amp;", "&"));
    expect(decodeQuery({ schema: machines.schema, params }).slice.sort).toEqual(
      [
        { field: "cores", direction: "desc" },
        { field: "status", direction: "asc" },
      ],
    );
  });
});
