import { createRowScopes } from "@canonical/dataviews-core/bindings";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, onTestFinished } from "vitest";
import {
  createMachineProvider,
  machine,
  machines,
} from "../../../../../../testing/machines.js";
import silenceRenderErrors from "../../../../../../testing/silenceRenderErrors.js";
import type { DisplayFieldCellProps } from "../../../../common/index.js";
import {
  useDataViewsCell,
  useDataViewsValue,
} from "../../../../hooks/index.js";
import FieldValue from "./FieldValue.js";

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

describe("FieldValue", () => {
  it("spells a primitive value as text", () => {
    const { provider, channels } = observeRow(["cores"]);
    const { container } = render(
      <FieldValue
        provider={provider}
        channels={channels}
        field={{ id: "cores", header: "Cores" }}
      />,
    );
    expect(container.textContent).toBe("8");
  });

  it("renders the field's own content inside the value's cell scope", () => {
    const Owner = ({ value, rowId, columnId }: DisplayFieldCellProps) => {
      const cell = useDataViewsCell(machines);
      const record = useDataViewsValue(cell.record);
      return (
        <span>
          {rowId}/{columnId}: {String(value)} on {record.name}
        </span>
      );
    };
    const { provider, channels } = observeRow(["status"]);
    render(
      <FieldValue
        provider={provider}
        channels={channels}
        field={{ id: "state", header: "State", field: "status", cell: Owner }}
      />,
    );
    expect(screen.getByText("m-1/state: failed on alpha")).toBeInTheDocument();
  });

  it("throws for a field its row's channels do not observe", () => {
    silenceRenderErrors();
    const { provider, channels } = observeRow(["name"]);
    expect(() =>
      render(
        <FieldValue
          provider={provider}
          channels={channels}
          field={{ id: "cores", header: "Cores" }}
        />,
      ),
    ).toThrow('no channel observes the field "cores"');
  });
});
