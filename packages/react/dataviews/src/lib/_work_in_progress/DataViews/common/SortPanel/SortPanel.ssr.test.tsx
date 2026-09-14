/**
 * On the server the panel lists the terms, and each move and removal is a
 * real link to the ordering it leads to, from the first page: nothing to
 * press until scripts run, and nothing offered without a location to lead
 * to.
 */

import { createMemoryLocation, decodeQuery } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
  machines,
} from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import SortPanel from "./SortPanel.js";

/**
 * Server markup of a root holding the panel, over a provider already sorted
 * by status then cores and on the third page of 25: started from a snapshot,
 * because a sort command would itself reset the page the links must reset.
 */
const renderPanel = (href: string | null): string => {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha")],
    capabilities: declareMachineOrdering(null),
    ...(href === null ? {} : { location: createMemoryLocation({ href }) }),
    snapshot: {
      query: "sort=status__asc&sort=cores__desc&page=3&size=25",
      presentation: {},
    },
  });
  return renderToString(
    <DataViews provider={provider}>
      <SortPanel />
    </DataViews>,
  );
};

/** The destination of each link in server markup, by the control it names. */
const listPanelLinks = (markup: string): ReadonlyMap<string, URLSearchParams> =>
  new Map(
    [...markup.matchAll(/<a href="\?([^"]*)"[^>]*data-control="([^"]+)"/g)].map(
      (match) => [
        match.at(2) ?? "",
        new URLSearchParams((match.at(1) ?? "").replaceAll("&amp;", "&")),
      ],
    ),
  );

describe("DataViews.SortPanel SSR", () => {
  it("lists each term with its direction, and no button", () => {
    const markup = renderPanel("/machines");
    expect(markup).toContain("status, ascending");
    expect(markup).toContain("cores, descending");
    expect(markup).not.toContain("<button");
  });

  it("links each move and removal to the ordering it leads to, from page one", () => {
    // The location carries the query, so it is where the provider stands.
    const links = listPanelLinks(
      renderPanel(
        "/machines?tab=inventory&sort=status__asc&sort=cores__desc&page=3&size=25",
      ),
    );
    // The first term cannot move up, nor the last down.
    expect([...links.keys()]).toEqual([
      "status:down",
      "status:remove",
      "cores:up",
      "cores:remove",
    ]);
    const decode = (control: string) => {
      const params = links.get(control);
      if (params === undefined) {
        throw new Error(`no link for ${control}`);
      }
      expect(params.get("tab")).toBe("inventory");
      return decodeQuery({ schema: machines.schema, params });
    };
    const reversed = [
      { field: "cores", direction: "desc" },
      { field: "status", direction: "asc" },
    ];
    expect(decode("status:down").slice.sort).toEqual(reversed);
    expect(decode("cores:up").slice.sort).toEqual(reversed);
    expect(decode("status:remove").slice.sort).toEqual([
      { field: "cores", direction: "desc" },
    ]);
    expect(decode("cores:remove").slice.sort).toEqual([
      { field: "status", direction: "asc" },
    ]);
    // From the first page, at the size the reader chose.
    for (const control of links.keys()) {
      expect(decode(control).window.page).toBe(1);
      expect(decode(control).window.size).toBe(25);
    }
  });

  it("offers no link without a location to lead to", () => {
    const markup = renderPanel(null);
    expect(markup).toContain("status, ascending");
    expect(markup).not.toContain("<a ");
  });
});
