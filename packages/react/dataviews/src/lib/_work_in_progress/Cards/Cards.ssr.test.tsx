/**
 * On the server, cards are plain list markup carrying the rows of the URL's
 * query, in its order, with native checkboxes and no grid role: nothing a
 * reader needs scripts for. A source that cannot answer within the call
 * renders pending, never an empty list claimed as no results.
 */

import {
  createArraySource,
  createDataViewsProvider,
  createMemoryLocation,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildFleet,
  createMachineProvider,
  machines,
} from "../../../../testing/machines.js";
import type { DisplayField } from "../../common/index.js";
import Cards from "./Cards.js";

const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "status", header: "Status" },
];

describe("Cards on the server", () => {
  it("draws the rows of the URL's query as a list of cards with native checkboxes", () => {
    const fleet = buildFleet(9);
    const provider = createDataViewsProvider({
      collection: machines,
      source: createArraySource({ rows: fleet, collection: machines }),
      location: createMemoryLocation({ href: "/machines?status=failed" }),
    });
    provider.refresh();
    const markup = renderToString(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        selectable
      />,
    );
    // Every third machine failed; they are drawn in the query's order.
    expect(
      [...markup.matchAll(/class="title">(host-\d{3})/g)].map((match) =>
        match.at(1),
      ),
    ).toEqual(["host-003", "host-006", "host-009"]);
    expect(markup).toContain('role="list"');
    expect(markup.match(/role="listitem"/g)).toHaveLength(3);
    // One per card, and one for the page.
    expect(markup.match(/type="checkbox"/g)).toHaveLength(4);
    expect(markup).not.toContain('role="grid"');
    expect(markup).not.toContain("Loading…");
  });

  it("renders pending when the source cannot answer within the call", () => {
    const { provider } = createMachineProvider();
    provider.refresh();
    const markup = renderToString(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
      />,
    );
    expect(markup).toContain('data-status="pending"');
    expect(markup).toContain("Loading…");
    expect(markup).not.toContain('role="listitem"');
  });
});
