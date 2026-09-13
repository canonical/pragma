import {
  createRowScopes,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deliverRows } from "../../../../../../testing/fixtures.js";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import { BodyCell } from "./index.js";

/**
 * One row's channels over the given fields, minted as the table mints
 * them. The row is fed to the provider by hand: nothing observes it here.
 */
const channelsOver = (fields: readonly string[]) => {
  const { provider } = createMachineProvider();
  const host = readProviderHost(provider);
  host.complete(host.refresh(), deliverRows([machine("m-1", "alpha")]));
  const scopes = createRowScopes({
    rows: provider.rows,
    selection: provider.selection,
    fields,
  });
  return { provider, channels: scopes.readRow("m-1") };
};

describe("BodyCell", () => {
  it("reports a field no scope channel observes instead of rendering nothing", () => {
    const { provider, channels } = channelsOver(["name"]);
    const failure = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <BodyCell
          provider={provider}
          channels={channels}
          column={{ id: "zone", header: "Zone" }}
          field="zone"
        />,
      ),
    ).toThrow('no channel observes the field "zone"');
    failure.mockRestore();
    expect(screen.queryByRole("cell")).toBeNull();
  });
});
