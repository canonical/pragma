import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeaderMenu from "./HeaderMenu.js";
import type { HeaderMenuProps } from "./types.js";

/** Every change a column in the middle of a table takes. */
const MIDDLE: HeaderMenuProps["offers"] = {
  hide: true,
  "move-left": true,
  "move-right": true,
};

const mount = ({
  sortable = true,
  removable = false,
  hideable = true,
  offers = MIDDLE,
}: {
  readonly sortable?: boolean;
  readonly removable?: boolean;
  readonly hideable?: boolean;
  readonly offers?: HeaderMenuProps["offers"];
} = {}) => {
  const onPlace = vi.fn();
  const onRemoveFromSort = vi.fn();
  const onChangeColumn = vi.fn();
  render(
    <HeaderMenu
      columnId="state"
      header="Status"
      sortable={sortable}
      removable={removable}
      hideable={hideable}
      offers={offers}
      onPlace={onPlace}
      onRemoveFromSort={onRemoveFromSort}
      onChangeColumn={onChangeColumn}
    />,
  );
  return { onPlace, onRemoveFromSort, onChangeColumn };
};

/** The menu's trigger, as it stands now: the menu replaces it while open. */
const findTrigger = (): HTMLElement =>
  screen.getByRole("button", { name: "Column options for Status" });

/** The items of the open menu, as they read. */
const listItemNames = (): readonly (string | null)[] =>
  screen.getAllByRole("menuitem").map((item) => item.textContent);

describe("HeaderMenu", () => {
  it("holds only its button while closed, named for the column", () => {
    mount();
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

  it("opens a menu of the column's sort, visibility and place when activated, focusing the first", async () => {
    mount();
    fireEvent.click(findTrigger());
    expect(listItemNames()).toEqual([
      "Sort ascending",
      "Sort descending",
      "Hide column",
      "Move column left",
      "Move column right",
    ]);
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
    mount();
    fireEvent.click(findTrigger());
    expect(findTrigger()).not.toHaveFocus();
  });

  it("offers remove only while the reader's ordering names the column", () => {
    mount({ removable: true });
    fireEvent.click(findTrigger());
    expect(
      screen.getByRole("menuitem", { name: "Remove from sort" }),
    ).toBeInTheDocument();
  });

  it("offers no sort on a column that offers none, and no hide on a column that may not be hidden", () => {
    mount({ sortable: false, hideable: false });
    fireEvent.click(findTrigger());
    expect(listItemNames()).toEqual(["Move column left", "Move column right"]);
  });

  it("disables the changes a column does not take now, and chooses nothing from them", () => {
    const { onChangeColumn } = mount({
      sortable: false,
      offers: {
        hide: false,
        "move-left": false,
        "move-right": true,
      },
    });
    fireEvent.click(findTrigger());
    const disabled = screen
      .getAllByRole("menuitem")
      .filter((item) => item.classList.contains("disabled"))
      .map((item) => item.textContent);
    expect(disabled).toEqual(["Hide column", "Move column left"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide column" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Move column left" }));
    expect(onChangeColumn).not.toHaveBeenCalled();
  });

  it("places the column in the direction chosen and returns focus to the trigger", () => {
    const { onPlace } = mount();
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sort descending" }));
    expect(onPlace).toHaveBeenCalledWith("state", "desc");
    expect(findTrigger()).toHaveFocus();
    // Closed, it has dropped back to its button, and opens again the same way.
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sort ascending" }));
    expect(onPlace).toHaveBeenLastCalledWith("state", "asc");
  });

  it("closes on Escape, returning focus to the trigger", async () => {
    mount();
    findTrigger().focus();
    fireEvent.click(findTrigger());
    await waitFor(() =>
      expect(screen.getAllByRole("menuitem").at(0)).toHaveFocus(),
    );
    fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
    await waitFor(() => expect(screen.queryAllByRole("menuitem")).toEqual([]));
    expect(findTrigger()).toHaveFocus();
  });

  it("removes the column when remove is chosen", () => {
    const { onPlace, onRemoveFromSort } = mount({ removable: true });
    fireEvent.click(findTrigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove from sort" }));
    expect(onRemoveFromSort).toHaveBeenCalledWith("state");
    expect(onPlace).not.toHaveBeenCalled();
    expect(findTrigger()).toHaveFocus();
  });

  it("hands back each change to the column's visibility and place, returning focus to the trigger", () => {
    const { onChangeColumn, onPlace } = mount();
    for (const [name, change] of [
      ["Hide column", "hide"],
      ["Move column left", "move-left"],
      ["Move column right", "move-right"],
    ] as const) {
      fireEvent.click(findTrigger());
      fireEvent.click(screen.getByRole("menuitem", { name }));
      expect(onChangeColumn).toHaveBeenLastCalledWith("state", change);
      expect(findTrigger()).toHaveFocus();
    }
    expect(onChangeColumn).toHaveBeenCalledTimes(3);
    expect(onPlace).not.toHaveBeenCalled();
  });
});
