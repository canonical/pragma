import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeaderMenu from "./HeaderMenu.js";

const mount = (removable: boolean) => {
  const onPlace = vi.fn();
  const onRemoveFromSort = vi.fn();
  render(
    <HeaderMenu
      columnId="state"
      header="Status"
      removable={removable}
      onPlace={onPlace}
      onRemoveFromSort={onRemoveFromSort}
    />,
  );
  return { onPlace, onRemoveFromSort };
};

/** The menu's trigger, as it stands now: the menu replaces it while open. */
const findTrigger = (): HTMLElement =>
  screen.getByRole("button", { name: "Sort options for Status" });

describe("HeaderMenu", () => {
  it("holds only its button while closed, named for the column", () => {
    mount(false);
    // Drawn as the menu's own trigger, before it mounts and after.
    expect(findTrigger()).toBe(
      document.querySelector(".ds.contextual-menu.menu > button.trigger"),
    );
    expect(findTrigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(findTrigger()).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("menu", { hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".contextual-menu__surface"),
    ).not.toBeInTheDocument();
  });

  it("opens a menu of sort items when activated, focusing the first", async () => {
    mount(false);
    fireEvent.click(findTrigger());
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Sort ascending", "Sort descending"]);
    expect(findTrigger()).toBe(
      document.querySelector(".ds.contextual-menu.menu > button.trigger"),
    );
    expect(findTrigger()).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Sort ascending" }),
      ).toHaveFocus(),
    );
  });

  it("takes no focus on opening from a button that did not have it", () => {
    mount(false);
    fireEvent.click(findTrigger());
    expect(findTrigger()).not.toHaveFocus();
  });

  it("offers remove only while the reader's ordering names the column", () => {
    mount(true);
    fireEvent.click(findTrigger());
    expect(
      screen.getByRole("menuitem", { name: "Remove from sort" }),
    ).toBeInTheDocument();
  });

  it("places the column in the direction chosen and returns focus to the trigger", () => {
    const { onPlace } = mount(false);
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sort descending" }));
    expect(onPlace).toHaveBeenCalledWith("state", "desc");
    expect(findTrigger()).toHaveFocus();
    // Closed, it has dropped back to its button, and opens again the same way.
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sort ascending" }));
    expect(onPlace).toHaveBeenLastCalledWith("state", "asc");
  });

  it("removes the column when remove is chosen", () => {
    const { onPlace, onRemoveFromSort } = mount(true);
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove from sort" }));
    expect(onRemoveFromSort).toHaveBeenCalledWith("state");
    expect(onPlace).not.toHaveBeenCalled();
    expect(findTrigger()).toHaveFocus();
  });
});
