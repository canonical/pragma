import { Button } from "@canonical/react-ds-global";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import SidePanel from "./Provider.js";
import type { WithSidePanelRender } from "./types.js";
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

/** The factory every test shares: a labelled panel with a body. */
const labelledPanel: WithSidePanelRender = ({ ref }) => (
  <SidePanel ref={ref} aria-label="Panel">
    <SidePanel.Content>Body</SidePanel.Content>
  </SidePanel>
);

describe("withSidePanel", () => {
  it("renders the trigger and a closed panel", () => {
    const ToggledButton = withSidePanel(Button, labelledPanel);
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);
    expect(
      screen.getByRole("button", { name: "Open panel" }),
    ).toBeInTheDocument();
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("opens the panel when the trigger is pressed", () => {
    const ToggledButton = withSidePanel(Button, labelledPanel);
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("open");
  });

  it("toggles: a second press closes the panel again", () => {
    const ToggledButton = withSidePanel(Button, labelledPanel);
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);
    const trigger = screen.getByRole("button", { name: "Open panel" });

    fireEvent.click(trigger);
    expect(getDialog(container)).toHaveAttribute("open");

    fireEvent.click(trigger);
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("runs the consumer's own onClick alongside the toggle", () => {
    const onClick = vi.fn();
    const ToggledButton = withSidePanel(Button, labelledPanel);
    render(<ToggledButton onClick={onClick}>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("hands the factory a close that closes the panel", () => {
    const ToggledButton = withSidePanel(Button, ({ ref, close }) => (
      <SidePanel ref={ref} aria-label="Panel">
        <SidePanel.Content>Body</SidePanel.Content>
        <SidePanel.Footer>
          <button onClick={close} type="button">
            Dismiss
          </button>
        </SidePanel.Footer>
      </SidePanel>
    ));
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(getDialog(container)).not.toHaveAttribute("open");
  });

  it("renders the panel the factory composes, props and all", () => {
    const ToggledButton = withSidePanel(Button, ({ ref }) => (
      <SidePanel ref={ref} aria-label="Filters" disableEscapeClose>
        <SidePanel.Content>Body</SidePanel.Content>
      </SidePanel>
    ));
    const { container } = render(<ToggledButton>Open panel</ToggledButton>);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(getDialog(container)).toHaveAttribute("aria-label", "Filters");

    // disableEscapeClose sits on the panel the factory wrote: Escape is ignored.
    fireEvent.keyDown(getDialog(container), { key: "Escape" });
    expect(getDialog(container)).toHaveAttribute("open");
  });

  it("names the wrapped component after its trigger", () => {
    const ToggledButton = withSidePanel(Button, labelledPanel);
    expect(ToggledButton.displayName).toBe("withSidePanel(Button)");
  });
});
