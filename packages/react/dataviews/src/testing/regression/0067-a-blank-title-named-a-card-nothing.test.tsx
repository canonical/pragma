/**
 * A card is named by its title field, and by its identity where that field
 * holds no text. A title holding the empty string is no text, but it passed
 * the fallback, so the card's checkbox was named "Select " and the card
 * itself had no name at all.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { Cards } from "../../lib/_work_in_progress/Cards/index.js";
import type { DisplayField } from "../../lib/common/index.js";

const fields: readonly DisplayField[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
];

describe("a card whose title holds no text", () => {
  it("is named by its identity, and so is its checkbox", () => {
    const { provider } = createMachineProvider({
      rows: [machine("m-1", ""), machine("m-2", "beta")],
    });
    render(
      <Cards
        provider={provider}
        fields={fields}
        title="name"
        label="Machines"
        selectable
      />,
    );
    expect(screen.getByRole("listitem", { name: "m-1" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select m-1" }),
    ).toBeInTheDocument();
    // The named one is unchanged.
    expect(screen.getByRole("listitem", { name: "beta" })).toBeInTheDocument();
  });
});
