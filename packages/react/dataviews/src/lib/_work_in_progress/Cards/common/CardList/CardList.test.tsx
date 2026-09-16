import { createRowScopes } from "@canonical/dataviews-core/bindings";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import type { DisplayField } from "../../../../common/index.js";
import CardList from "./CardList.js";

const title: DisplayField = { id: "name", header: "Name" };
const details: readonly DisplayField[] = [{ id: "status", header: "Status" }];

/**
 * A provider answered with two machines, and the scopes its cards read.
 *
 * @note Impure: observes the provider and its row scopes.
 */
const observeFleet = () => {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha"), machine("m-2", "beta", "failed")],
  });
  const releaseProvider = provider.observe();
  const scopes = createRowScopes({
    rows: provider.rows,
    selection: provider.selection,
    fields: ["name", "status"],
  });
  const releaseScopes = scopes.observe();
  onTestFinished(() => {
    releaseScopes();
    releaseProvider();
  });
  return { provider, scopes };
};

describe("CardList", () => {
  it("lays the records out as a list of the design system's cards", () => {
    const { provider, scopes } = observeFleet();
    render(
      <CardList
        provider={provider}
        // The positions the core gives a page of records: it counts a
        // header row as the first, which the cards have none of.
        records={[
          {
            kind: "record",
            id: "record:m-1",
            index: 2,
            parent: null,
            rowId: "m-1",
          },
          {
            kind: "record",
            id: "record:m-2",
            index: 3,
            parent: null,
            rowId: "m-2",
          },
        ]}
        readRow={scopes.readRow}
        title={title}
        details={details}
        selectable={false}
        nameRecord={() => null}
      />,
    );
    const list = screen.getByRole("list");
    expect(list).toHaveClass("ds", "cards");
    expect(within(list).getByRole("listitem", { name: "alpha" })).toBe(
      within(list).getAllByRole("listitem").at(0),
    );
    expect(within(list).getByRole("listitem", { name: "beta" })).toBe(
      within(list).getAllByRole("listitem").at(1),
    );
  });

  it("draws no card for an empty page", () => {
    const { provider, scopes } = observeFleet();
    render(
      <CardList
        provider={provider}
        records={[]}
        readRow={scopes.readRow}
        title={title}
        details={details}
        selectable={false}
        nameRecord={() => null}
      />,
    );
    expect(within(screen.getByRole("list")).queryAllByRole("listitem")).toEqual(
      [],
    );
  });

  it("offers a checkbox per card where the cards are selectable", () => {
    const { provider, scopes } = observeFleet();
    render(
      <CardList
        provider={provider}
        // The positions the core gives a page of records: it counts a
        // header row as the first, which the cards have none of.
        records={[
          {
            kind: "record",
            id: "record:m-1",
            index: 2,
            parent: null,
            rowId: "m-1",
          },
        ]}
        readRow={scopes.readRow}
        title={title}
        details={details}
        selectable
        nameRecord={() => null}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Select alpha" }),
    ).toBeInTheDocument();
  });
});
