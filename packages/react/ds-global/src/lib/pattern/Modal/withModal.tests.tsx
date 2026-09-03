import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Button } from "../../component/Button/index.js";
import { withModal } from "./index.js";
import Modal from "./Modal.js";

/*
  jsdom 28 implements HTMLDialogElement but not the top layer: `showModal` and
  `close` are absent. Stub them to toggle the `open` attribute, which is all
  the component and these assertions depend on.
*/
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ): void {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
    ): void {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
});

const modalChildren = (
  <>
    <Modal.Header>Title</Modal.Header>
    <Modal.Content>Body</Modal.Content>
  </>
);

describe("withModal", () => {
  it("renders the wrapped component with a closed dialog", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("opens the modal when the trigger is clicked", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("closes the modal through the header close button", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(container.querySelector("dialog")).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("closes the modal when the platform fires cancel", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = container.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");

    fireEvent(dialog as Element, new Event("cancel", { cancelable: true }));
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("closes the modal through a footer action given the close callback", () => {
    const TriggeredModal = withModal(Button, (close) => (
      <>
        <Modal.Header>Title</Modal.Header>
        <Modal.Content>Body</Modal.Content>
        <Modal.Footer>
          <button type="button" onClick={close}>
            Done
          </button>
        </Modal.Footer>
      </>
    ));
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(container.querySelector("dialog")).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("forwards props to the wrapped component", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    render(<TriggeredModal importance="secondary">Open</TriggeredModal>);

    expect(screen.getByRole("button", { name: "Open" })).toHaveClass(
      "secondary",
    );
  });

  it("passes modal props through to the dialog", () => {
    const TriggeredModal = withModal(Button, modalChildren, {
      className: "custom-modal",
      closeOnBackdropClick: true,
    });
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = container.querySelector("dialog");
    expect(dialog).toHaveClass("custom-modal");

    // A click landing on the dialog itself is a backdrop click.
    fireEvent.click(dialog as Element);
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("renders the trigger without a wrapper element", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    const trigger = screen.getByRole("button", { name: "Open" });
    // The open handler sits on the trigger itself; nothing wraps it.
    expect(trigger.parentElement).toBe(container);
  });

  it("runs the consumer's onClick before opening the modal", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const onClick = vi.fn();
    const { container } = render(
      <TriggeredModal onClick={onClick}>Open</TriggeredModal>,
    );
    const dialog = container.querySelector("dialog");
    onClick.mockImplementation(() => {
      // The consumer's handler runs first: the modal is still closed.
      expect(dialog).not.toHaveAttribute("open");
    });

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
  });

  it("sets the wrapped component's displayName", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    expect(TriggeredModal.displayName).toBe("withModal(Button)");
  });
});
