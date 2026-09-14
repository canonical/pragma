/**
 * Regression: a sortable header is a link until scripts take over.
 *
 * Before the fix, the server sent each sortable header as a button, which
 * does nothing until a script runs — and nothing, ever, without one — so a
 * reader without scripting could not sort at all, and every reader was
 * offered a control that did not work yet.
 */

import { createMemoryLocation, decodeQuery } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machines,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

describe("regression 0008 — a sort header was a dead button before hydration", () => {
  it("sends a link to the next ordering in place of a button", () => {
    const { provider } = createMachineProvider({
      location: createMemoryLocation({ href: "/machines" }),
      capabilities: declareMachineOrdering(3),
    });
    const markup = renderToString(
      <DataTable
        provider={provider}
        columns={[{ id: "cores", header: "Cores", sortable: true }]}
        label="Machines"
      />,
    );
    expect(markup).not.toContain("<button");
    const href = /<a href="\?([^"]*)"[^>]*class="sort"/.exec(markup)?.at(1);
    expect(href).toBeDefined();
    const query = decodeQuery({
      schema: machines.schema,
      params: new URLSearchParams((href ?? "").replaceAll("&amp;", "&")),
    });
    expect(query.issues).toEqual([]);
    expect(query.slice.sort).toEqual([{ field: "cores", direction: "asc" }]);
    expect(query.window.page).toBe(1);
  });
});
