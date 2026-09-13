/**
 * On the server there is no viewport, so a windowed table renders its whole
 * current window: the markup a reader without JavaScript gets is complete,
 * and the range narrows it once the client measures.
 */
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deliverRows } from "../../../../../testing/fixtures.js";
import {
  createMachineProvider,
  machine,
} from "../../../../../testing/machines.js";
import { DataTable } from "../../../_work_in_progress/DataTable/index.js";
import virtualizeRows from "../../virtualizeRows.js";

describe("windowed DataTable SSR", () => {
  it("renders every row of the window, each at its logical position", () => {
    // Rows the server already holds, fed to the provider by hand: nothing
    // observes it there, so nothing else would ask the source.
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    host.complete(
      host.refresh(),
      deliverRows(
        Array.from({ length: 30 }, (_, position) =>
          machine(`m-${position}`, `host-${position}`),
        ),
      ),
    );
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
