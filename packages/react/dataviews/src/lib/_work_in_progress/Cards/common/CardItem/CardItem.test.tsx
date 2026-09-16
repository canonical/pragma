import { createRowScopes } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import silenceRenderErrors from "../../../../../../testing/silenceRenderErrors.js";
import CardItem from "./CardItem.js";

/**
 * A provider answered with one machine, and the channels of its row over
 * the observed fields, released when the test finishes.
 *
 * @note Impure: observes the provider and its row scopes.
 */
const observeRow = (fields: readonly string[]) => {
  const { provider } = createMachineProvider({
    rows: [machine("m-1", "alpha", "failed", 8)],
  });
  const releaseProvider = provider.observe();
  const scopes = createRowScopes({
    rows: provider.rows,
    selection: provider.selection,
    fields,
  });
  const releaseScopes = scopes.observe();
  onTestFinished(() => {
    releaseScopes();
    releaseProvider();
  });
  return { provider, channels: scopes.readRow("m-1") };
};

describe("CardItem", () => {
  it("is a list item named by its title, holding its title and its details", () => {
    const { provider, channels } = observeRow(["name", "status"]);
    render(
      <ul>
        <CardItem
          provider={provider}
          channels={channels}
          title={{ id: "name", header: "Name" }}
          details={[{ id: "status", header: "Status" }]}
          selectable={false}
          nameRecord={() => null}
        />
      </ul>,
    );
    const card = screen.getByRole("listitem", { name: "alpha" });
    expect(card).toHaveClass("ds", "card", "data-card");
    expect(card.querySelector(".header")).toHaveTextContent("alpha");
    expect(card.querySelector(".content dd")).toHaveTextContent("failed");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("toggles its record's selection from its checkbox, named by the caller's label", () => {
    const { provider, channels } = observeRow(["name"]);
    render(
      <ul>
        <CardItem
          provider={provider}
          channels={channels}
          title={{ id: "name", header: "Name" }}
          details={[]}
          selectable
          nameRecord={(row, rowId) => `${row.name} (${rowId})`}
        />
      </ul>,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: "Select alpha (m-1)",
    });
    fireEvent.click(checkbox);
    expect([...provider.selection.state.get().ids]).toEqual(["m-1"]);
    expect(checkbox).toBeChecked();
    act(() => {
      provider.selection.clear();
    });
    expect(checkbox).not.toBeChecked();
  });

  it("throws when its title's field is not observed", () => {
    silenceRenderErrors();
    const { provider, channels } = observeRow(["status"]);
    expect(() =>
      render(
        <CardItem
          provider={provider}
          channels={channels}
          title={{ id: "name", header: "Name" }}
          details={[]}
          selectable={false}
          nameRecord={() => null}
        />,
      ),
    ).toThrow('no channel observes the field "name"');
  });
});
