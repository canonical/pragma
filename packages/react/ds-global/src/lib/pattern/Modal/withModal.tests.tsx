import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Button } from "../../component/Button/index.js";
import { withModal } from "./index.js";
import Modal from "./Modal.js";
import type { WithModalOptions } from "./types.js";

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
      // The platform throws on an already-open dialog, and the guards against
      // that are worth testing, so the stub throws too.
      if (this.open) {
        throw new DOMException(
          "The dialog is already open.",
          "InvalidStateError",
        );
      }
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
      returnValue?: string,
    ): void {
      // The platform only fires `close` when the dialog was open, and records
      // the return value the caller passed.
      if (!this.open) return;
      this.open = false;
      if (returnValue !== undefined) this.returnValue = returnValue;
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

  it("reopens the modal after it has been closed", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(container.querySelector("dialog")).toHaveAttribute("open");
  });

  /*
    Escape reaches the dialog as a cancelable `cancel` event whose default
    action closes it. Nothing in the HOC or the modal may cancel that — jsdom
    performs no default action, so the assertion is that the event survives.
  */
  it("leaves the platform's cancel default action intact", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = container.querySelector("dialog") as HTMLDialogElement;
    const cancel = new Event("cancel", { cancelable: true });

    expect(dialog.dispatchEvent(cancel)).toBe(true);
    expect(cancel.defaultPrevented).toBe(false);
  });

  it("keeps the trigger wired when modalProps smuggle in a ref or defaultOpen", () => {
    // `WithModalOptions` omits both, but a consumer holding a `ModalProps`
    // value is structurally assignable, and the HOC has to win at runtime.
    const strayRef = createRef<HTMLDialogElement>();
    const TriggeredModal = withModal(Button, modalChildren, {
      ref: strayRef,
      defaultOpen: true,
    } as WithModalOptions);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    expect(strayRef.current).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(container.querySelector("dialog")).toHaveAttribute("open");
  });

  it("ignores a trigger click while the modal is already open", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);
    // showModal() throws on an already-open dialog, so a second click has to
    // stop at the trigger rather than reach the platform.
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const callCount = showModal.mock.calls.length;
    showModal.mockRestore();

    expect(callCount).toBe(1);
    expect(container.querySelector("dialog")).toHaveAttribute("open");
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

  it("wraps the trigger in a modal-trigger span", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    const { container } = render(<TriggeredModal>Open</TriggeredModal>);

    const trigger = container.querySelector(".ds.modal-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toContainElement(
      screen.getByRole("button", { name: "Open" }),
    );
  });

  it("sets the wrapped component's displayName", () => {
    const TriggeredModal = withModal(Button, modalChildren);
    expect(TriggeredModal.displayName).toBe("withModal(Button)");
  });
});
