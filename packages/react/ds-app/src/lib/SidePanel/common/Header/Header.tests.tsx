import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SidePanelContext from "../../Context.js";
import type { SidePanelContextValue } from "../../types.js";
import Header from "./Header.js";

const renderInPanel = (
  ui: React.ReactElement,
  context: Partial<SidePanelContextValue> = {},
) =>
  render(
    <SidePanelContext.Provider
      value={{ close: vi.fn(), titleId: "title-id", ...context }}
    >
      {ui}
    </SidePanelContext.Provider>,
  );

describe("SidePanel.Header", () => {
  describe("rendering", () => {
    it("applies the base and custom class", () => {
      renderInPanel(<Header className="custom-class">Panel title</Header>);
      const element = screen.getByRole("heading", {
        name: "Panel title",
      }).parentElement;
      expect(element?.className).toContain("ds side-panel-header");
      expect(element?.className).toContain("custom-class");
    });

    it("passes through additional props", () => {
      renderInPanel(<Header data-testid="test-component">Title</Header>);
      expect(screen.getByTestId("test-component")).toBeInTheDocument();
    });

    it("puts the panel's title id on its heading, so the panel is named by it", () => {
      renderInPanel(<Header>Panel title</Header>, { titleId: "panel-title" });
      expect(
        screen.getByRole("heading", { name: "Panel title" }),
      ).toHaveAttribute("id", "panel-title");
    });
  });

  describe("close button", () => {
    it("closes the panel when pressed", async () => {
      const close = vi.fn();
      renderInPanel(<Header>Panel title</Header>, { close });
      screen.getByRole("button", { name: "Close panel" }).click();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("takes a custom accessible name", () => {
      renderInPanel(<Header dismissLabel="Dismiss filters">Filters</Header>);
      expect(
        screen.getByRole("button", { name: "Dismiss filters" }),
      ).toBeInTheDocument();
    });

    it("is omitted when the panel is dismissed from elsewhere", () => {
      renderInPanel(<Header dismissible={false}>Panel title</Header>);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    /*
      The header degrades rather than throws outside a panel: there is nothing
      to ask to close, so it renders the heading alone. That is what lets it be
      documented and tested in isolation.
    */
    it("is omitted outside a panel, where there is nothing to close", () => {
      render(<Header>Panel title</Header>);
      expect(
        screen.getByRole("heading", { name: "Panel title" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
