import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import silenceRenderErrors from "../../../../../../testing/silenceRenderErrors.js";
import type { DisplayField } from "../../../../common/index.js";
import DataViews from "../../Provider.js";
import Cards from "./Cards.js";

const fields: readonly DisplayField[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
];

describe("DataViews Cards", () => {
  it("renders the enclosing root's records as cards", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", "alpha"), machine("m-2", "beta", "failed")],
    });
    render(
      <DataViews provider={provider}>
        <Cards fields={fields} title="name" label="Machines" />
      </DataViews>,
    );
    const list = within(
      screen.getByRole("region", { name: "Machines" }),
    ).getByRole("list");
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((card) => card.textContent?.startsWith("alpha") === true),
    ).toEqual([true, false]);
    expect(
      within(list).getByRole("listitem", { name: "beta" }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole("listitem", { name: "beta" }),
    ).toHaveTextContent("failed");
  });

  it("throws outside a DataViews root, naming the part", () => {
    silenceRenderErrors();
    expect(() =>
      render(<Cards fields={fields} title="name" label="Machines" />),
    ).toThrow("DataViews.Cards must be used inside a DataViews root");
  });
});
