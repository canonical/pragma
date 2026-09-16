/**
 * The renderer switch held the id of a renderer the application had stopped
 * offering. It showed the first renderer meanwhile, as it should, but the
 * moment the withdrawn one was offered again it jumped back to it, though
 * nobody had chosen it since.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RendererChoice } from "../../lib/_work_in_progress/RendererSwitch/index.js";
import { RendererSwitch } from "../../lib/_work_in_progress/RendererSwitch/index.js";

const table: RendererChoice = {
  id: "table",
  label: "Table",
  content: <p>the table</p>,
};
const cards: RendererChoice = {
  id: "cards",
  label: "Cards",
  content: <p>the cards</p>,
};

describe("a renderer withdrawn while it was chosen", () => {
  it("is not chosen again when it comes back", () => {
    const { rerender } = render(
      <RendererSwitch label="Show machines as" renderers={[table, cards]} />,
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Show machines as" }),
      { target: { value: "cards" } },
    );
    expect(screen.getByText("the cards")).toBeInTheDocument();

    rerender(<RendererSwitch label="Show machines as" renderers={[table]} />);
    expect(screen.getByText("the table")).toBeInTheDocument();

    rerender(
      <RendererSwitch label="Show machines as" renderers={[table, cards]} />,
    );
    expect(screen.getByText("the table")).toBeInTheDocument();
    expect(screen.queryByText("the cards")).toBeNull();
    expect(
      screen.getByRole<HTMLSelectElement>("combobox", {
        name: "Show machines as",
      }).value,
    ).toBe("table");
  });
});
