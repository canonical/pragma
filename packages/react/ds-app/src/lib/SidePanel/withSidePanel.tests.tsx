import { Button } from "@canonical/react-ds-global";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import SidePanel from "./SidePanel.js";
import withSidePanel from "./withSidePanel.js";

/*
  jsdom 28 implements no part of the dialog API — the same minimum stubs as
  SidePanel's own suite: reflect the `open` attribute, and dispatch `close`
  the way the platform does.
*/
const originalShow = HTMLDialogElement.prototype.show;
const originalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.toggleAttribute("open", true);
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.toggleAttribute("open", false);
    this.dispatchEvent(new Event("close"));
  };
});

afterAll(() => {
  HTMLDialogElement.prototype.show = originalShow;
  HTMLDialogElement.prototype.close = originalClose;
});

const getDialog = (container: HTMLElement): HTMLDialogElement => {
  const dialog = container.querySelector("dialog");
  if (!dialog) throw new Error("withSidePanel rendered no dialog element");
  return dialog;
};

describe("withSidePanel", () => {
  it("renders the trigger and a closed panel", () => {
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
      { "aria-label": "Panel" },
    );
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);
    expect(
      screen.getByRole("button", { name: "Open panel" }),
    ).toBeInTheDocument();
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("opens the panel when the trigger is pressed", () => {
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
      { "aria-label": "Panel" },
    );
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("open");
  });

  it("toggles: a second press closes the panel again", () => {
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
      { "aria-label": "Panel" },
    );
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);
    const trigger = screen.getByRole("button", { name: "Open panel" });

    fireEvent.click(trigger);
    expect(getDialog(container)).toHaveAttribute("open");

    fireEvent.click(trigger);
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("runs the consumer's own onClick alongside the toggle", () => {
    const onClick = vi.fn();
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
      { "aria-label": "Panel" },
    );
    render(<ToggledButton onClick={onClick}>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("hands function children a close that closes the panel", () => {
    const ToggledButton = withSidePanel(
      Button,
      (close) => (
        <>
          <SidePanel.Content>Body</SidePanel.Content>
          <SidePanel.Footer>
            <button onClick={close} type="button">
              Dismiss
            </button>
          </SidePanel.Footer>
        </>
      ),
      { "aria-label": "Panel" },
    );
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("forwards panel props to the panel", () => {
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
      { "aria-label": "Filters", closeOnOutsideClick: true },
    );
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("aria-label", "Filters");

    // closeOnOutsideClick reached the panel: an outside press closes it.
    fireEvent.pointerDown(document.body);
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("names the wrapped component after its trigger", () => {
    const ToggledButton = withSidePanel(
      Button,
      <SidePanel.Content>Body</SidePanel.Content>,
    );
    expect(ToggledButton.displayName).toBe("withSidePanel(Button)");
  });
});
