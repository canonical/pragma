import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { createRef, useEffect, useRef } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Component from "./Provider.js";
import type { ModalProps } from "./types.js";

/*
  jsdom 28 implements HTMLDialogElement but not the top layer: `showModal` and
  `close` are absent. Stub them to toggle the `open` attribute, which is all the
  component and these assertions depend on.
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

/**
  Renders the modal in its open state, opened the way a consumer opens it: a
  ref, and `showModal()` once on mount.
*/
const OpenModal = (props: Omit<ModalProps, "ref">): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return <Component {...props} ref={ref} />;
};

describe("Modal pattern", () => {
  describe("rendering", () => {
    it("applies base classes", () => {
      render(
        <OpenModal>
          <Component.Content>Placeholder content</Component.Content>
        </OpenModal>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("ds", "modal");
    });

    it("renders the composed sections inside the dialog", () => {
      const { container } = render(
        <OpenModal>
          <Component.Header>Title</Component.Header>
          <Component.Content>Placeholder content</Component.Content>
          <Component.Footer>
            <button type="button">Confirm</button>
          </Component.Footer>
        </OpenModal>,
      );
      expect(container.querySelector(".ds.modal-header")).toHaveTextContent(
        "Title",
      );
      expect(container.querySelector(".ds.modal-content")).toHaveTextContent(
        "Placeholder content",
      );
      expect(container.querySelector(".ds.modal-footer")).toHaveTextContent(
        "Confirm",
      );
    });

    it("renders only the sections the consumer composes", () => {
      const { container } = render(
        <OpenModal>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(container.querySelector(".ds.modal-header")).toBeNull();
      expect(container.querySelector(".ds.modal-footer")).toBeNull();
      expect(container.querySelector(".ds.modal-content")).toBeInTheDocument();
    });

    it("passes the consumer className through", () => {
      render(
        <OpenModal className="custom">
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("custom");
    });

    /*
      The backdrop handler is composed with the consumer's, not replaced by it:
      a plain spread would let an unrelated onClick silently disable
      closeOnBackdropClick.
    */
    it("calls a consumer onClick as well as closing on the backdrop", () => {
      const onClick = vi.fn();
      const { container } = render(
        <OpenModal closeOnBackdropClick onClick={onClick}>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );

      screen.getByRole("dialog").click();

      expect(onClick).toHaveBeenCalled();
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });
  });

  describe("accessible name", () => {
    it("names the dialog with a consumer aria-label when there is no header", () => {
      render(
        <OpenModal aria-label="Search syntax">
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(
        screen.getByRole("dialog", { name: "Search syntax" }),
      ).toBeInTheDocument();
    });

    /*
      `aria-labelledby` wins over `aria-label` in the accessible-name
      computation, so the header's title id must not be set when the consumer
      has named the dialog itself — it would win, and point at nothing.
    */
    it("drops the header title id when a consumer aria-label is given", () => {
      render(
        <OpenModal aria-label="Named by the consumer">
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).not.toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAccessibleName("Named by the consumer");
    });

    it("prefers a consumer aria-labelledby over the header title", () => {
      render(
        <>
          <h1 id="page-title">Named elsewhere</h1>
          <OpenModal aria-labelledby="page-title">
            <Component.Header>Title</Component.Header>
            <Component.Content>Body</Component.Content>
          </OpenModal>
        </>,
      );
      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-labelledby",
        "page-title",
      );
    });
  });

  describe("open state", () => {
    it("stays closed by default", () => {
      const { container } = render(
        <Component ref={createRef<HTMLDialogElement>()}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });

    it("passes the native close event through to the consumer", () => {
      const onClose = vi.fn();
      const ref = createRef<HTMLDialogElement>();
      render(
        <Component ref={ref} onClose={onClose}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      ref.current?.showModal();
      ref.current?.close();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    /*
      `onClose` says the modal is gone, not how it went. An action that has to
      be told apart from a dismissal closes with a return value, which the
      platform records on the dialog.
    */
    it("carries a close return value to the consumer", () => {
      const returnValues: string[] = [];
      const ref = createRef<HTMLDialogElement>();
      render(
        <Component
          ref={ref}
          onClose={(event) =>
            returnValues.push(event.currentTarget.returnValue)
          }
        >
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      ref.current?.showModal();
      ref.current?.close("confirm");

      expect(returnValues).toEqual(["confirm"]);
    });

    /*
      Escape has no handler of its own: the `cancel` event closes the dialog as
      its default action, so the modal must not cancel that event on the
      consumer's behalf.
    */
    it("leaves the cancel event's default action intact", () => {
      render(
        <OpenModal>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );

      const cancel = new Event("cancel", { cancelable: true });
      const notPrevented = screen.getByRole("dialog").dispatchEvent(cancel);

      expect(notPrevented).toBe(true);
      expect(cancel.defaultPrevented).toBe(false);
    });

    it("passes the native cancel event through to the consumer", () => {
      const onCancel = vi.fn();
      render(
        <OpenModal onCancel={onCancel}>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );

      screen
        .getByRole("dialog")
        .dispatchEvent(new Event("cancel", { cancelable: true }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("ref control", () => {
    it("attaches the consumer ref to the dialog", () => {
      const ref = createRef<HTMLDialogElement>();
      render(
        <Component ref={ref}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(ref.current).toBe(screen.getByRole("dialog", { hidden: true }));
    });

    it("opens through the ref", () => {
      const ref = createRef<HTMLDialogElement>();
      const { container } = render(
        <Component ref={ref}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      ref.current?.showModal();

      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });

    it("closes through the ref", () => {
      const ref = createRef<HTMLDialogElement>();
      const { container } = render(
        <Component ref={ref}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      ref.current?.showModal();
      expect(container.querySelector("dialog")).toHaveAttribute("open");

      ref.current?.close();

      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });

    /*
      The round trip the controlled implementation could not do: a dismissal
      from the inside left `open` and the DOM out of step, and the modal could
      never be reopened. With the state in the element there is nothing to
      desync.
    */
    it("reopens through the ref after a dismissal from the inside", () => {
      const ref = createRef<HTMLDialogElement>();
      const { container } = render(
        <Component ref={ref}>
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      ref.current?.showModal();

      screen.getByRole("button", { name: "Close" }).click();
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");

      ref.current?.showModal();

      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });

    it("accepts a callback ref", () => {
      const received: (HTMLDialogElement | null)[] = [];
      render(
        <Component
          ref={(node) => {
            received.push(node);
          }}
        >
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(received.at(0)).toBe(screen.getByRole("dialog", { hidden: true }));
    });

    /*
      React 19 runs a ref callback's returned cleanup instead of calling the
      callback with null. Merging the consumer's ref must not swallow that.
    */
    it("runs a callback ref's cleanup on unmount", () => {
      const cleanup = vi.fn();
      const detached = vi.fn();
      const { unmount } = render(
        <Component
          ref={(node) => {
            if (!node) detached();
            return cleanup;
          }}
        >
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      unmount();

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(detached).not.toHaveBeenCalled();
    });
  });

  describe("header", () => {
    it("names the dialog with the composed title", () => {
      render(
        <OpenModal>
          <Component.Header>Delete instance</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(
        screen.getByRole("dialog", { name: "Delete instance" }),
      ).toBeInTheDocument();
    });

    it("renders a close button by default", () => {
      render(
        <OpenModal>
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("closes the modal when the close button is pressed", () => {
      const { container } = render(
        <OpenModal>
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      screen.getByRole("button", { name: "Close" }).click();
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });

    it("renders no close button when undismissible", () => {
      render(
        <OpenModal>
          <Component.Header undismissible>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(
        screen.queryByRole("button", { name: "Close" }),
      ).not.toBeInTheDocument();
    });

    it("uses a custom dismiss label", () => {
      render(
        <OpenModal>
          <Component.Header dismissLabel="Dismiss">Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      expect(
        screen.getByRole("button", { name: "Dismiss" }),
      ).toBeInTheDocument();
    });

    it("prefers an explicit onDismiss over closing the modal", () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <OpenModal>
          <Component.Header onDismiss={onDismiss}>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      screen.getByRole("button", { name: "Close" }).click();
      expect(onDismiss).toHaveBeenCalled();
      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });
  });

  describe("backdrop", () => {
    it("closes on a click that lands on the dialog itself", () => {
      const { container } = render(
        <OpenModal closeOnBackdropClick>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      screen.getByRole("dialog").click();
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });

    it("ignores backdrop clicks by default", () => {
      const { container } = render(
        <OpenModal>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      screen.getByRole("dialog").click();
      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });

    it("ignores backdrop clicks when closeOnBackdropClick is false", () => {
      const { container } = render(
        <OpenModal closeOnBackdropClick={false}>
          <Component.Content>Body</Component.Content>
        </OpenModal>,
      );
      screen.getByRole("dialog").click();
      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });

    it("ignores clicks inside the content pane", () => {
      const { container } = render(
        <OpenModal closeOnBackdropClick>
          <Component.Content>Placeholder content</Component.Content>
        </OpenModal>,
      );
      screen.getByText("Placeholder content").click();
      expect(container.querySelector("dialog")).toHaveAttribute("open");
    });
  });
});
