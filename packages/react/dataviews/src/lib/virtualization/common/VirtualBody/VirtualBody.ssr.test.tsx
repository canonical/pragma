/**
 * On the server there is no viewport, so a windowed table renders its whole
 * current window: the markup a reader without JavaScript gets is complete,
 * and the range narrows it once the client measures.
 */
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable } from "../../../_work_in_progress/DataTable/index.js";
import virtualizeRows from "../../virtualizeRows.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

describe("windowed DataTable SSR", () => {
  it("renders every row of the window, each at its logical position", () => {
    const provider = createDataViewsProvider({ schema });
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    const rows = Array.from({ length: 30 }, (_, position) => ({
      id: `m-${position}`,
      name: `host-${position}`,
    }));
    const counted = { kind: "exact", value: 30 } as const;
    provider.complete(requestId, {
      status: "succeeded",
      page: {
        rows,
        groups: null,
        counts: { pageable: counted, matched: counted, total: counted },
        more: null,
        cursors: null,
      },
    });
    const html = renderToString(
      <DataTable
        provider={provider}
        label="Machines"
        columns={[{ id: "name", header: "Name" }]}
        windowing={virtualizeRows({ estimatedRowHeight: 32 })}
      />,
    );
    expect(html).toContain('aria-rowcount="31"');
    expect(html.match(/role="row"/g)).toHaveLength(31);
    expect(html).toContain('aria-rowindex="31"');
    expect(html).toContain("host-29");
    expect(html).not.toContain("data-table-gap");
  });
});
