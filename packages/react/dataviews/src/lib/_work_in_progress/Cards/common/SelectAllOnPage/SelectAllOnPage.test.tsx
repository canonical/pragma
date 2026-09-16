import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createFakeChannel from "../../../../../../testing/createFakeChannel.js";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import SelectAllOnPage from "./SelectAllOnPage.js";

/** The control over a page of two identities, with the collection's selection. */
const renderControl = (ids: readonly string[] = ["m-1", "m-2"]) => {
  const { provider } = createMachineProvider();
  const channel = createFakeChannel<readonly string[]>(ids);
  const view = render(
    <SelectAllOnPage selection={provider.selection} ids={channel} />,
  );
  return { provider, channel, view };
};

/** The control's checkbox, named for its scope. */
const readCheckbox = (): HTMLInputElement =>
  screen.getByRole<HTMLInputElement>("checkbox", {
    name: "Select all displayed rows",
  });

describe("SelectAllOnPage", () => {
  it("selects the page's identities, keeping a selection made elsewhere", () => {
    const { provider } = renderControl();
    act(() => {
      provider.selection.add(["elsewhere"]);
    });
    fireEvent.click(readCheckbox());
    expect([...provider.selection.state.get().ids].sort()).toEqual([
      "elsewhere",
      "m-1",
      "m-2",
    ]);
    expect(readCheckbox().checked).toBe(true);
  });

  it("clears the page's identities once every one is selected", () => {
    const { provider } = renderControl();
    act(() => {
      provider.selection.add(["m-1", "m-2", "elsewhere"]);
    });
    expect(readCheckbox().checked).toBe(true);
    fireEvent.click(readCheckbox());
    expect([...provider.selection.state.get().ids]).toEqual(["elsewhere"]);
  });

  it("shows part of the page as mixed, and an empty page as neither", () => {
    const { provider } = renderControl();
    act(() => {
      provider.selection.add(["m-1"]);
    });
    expect(readCheckbox().checked).toBe(false);
    expect(readCheckbox().indeterminate).toBe(true);
    const empty = renderControl([]);
    act(() => {
      empty.provider.selection.add(["elsewhere"]);
    });
    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox", {
      name: "Select all displayed rows",
    });
    expect(boxes.at(1)?.checked).toBe(false);
    expect(boxes.at(1)?.indeterminate).toBe(false);
  });

  it("follows the identities its channel publishes", () => {
    const { provider, channel } = renderControl();
    act(() => {
      provider.selection.add(["m-1", "m-2"]);
    });
    expect(readCheckbox().checked).toBe(true);
    // A page turn: another identity nobody selected joins the scope.
    act(() => {
      channel.set(["m-1", "m-2", "m-3"]);
    });
    expect(readCheckbox().checked).toBe(false);
    expect(readCheckbox().indeterminate).toBe(true);
  });
});
