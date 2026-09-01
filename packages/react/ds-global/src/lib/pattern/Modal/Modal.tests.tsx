import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Component from "./Modal.js";

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

describe("Modal pattern", () => {
  describe("rendering", () => {
    it("applies base classes", () => {
      render(
        <Component open>
          <Component.Content>Placeholder content</Component.Content>
        </Component>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("ds", "modal");
    });

    it("renders the composed sections inside the dialog", () => {
      const { container } = render(
        <Component open>
          <Component.Header>Title</Component.Header>
          <Component.Content>Placeholder content</Component.Content>
          <Component.Footer>
            <button type="button">Confirm</button>
          </Component.Footer>
        </Component>,
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
        <Component open>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(container.querySelector(".ds.modal-header")).toBeNull();
      expect(container.querySelector(".ds.modal-footer")).toBeNull();
      expect(container.querySelector(".ds.modal-content")).toBeInTheDocument();
    });

    it("passes the consumer className through", () => {
      render(
        <Component open className="custom">
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("custom");
    });
  });

  describe("open state", () => {
    it("opens the native dialog when open is true", () => {
      render(
        <Component open>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(screen.getByRole("dialog")).toHaveAttribute("open");
    });

    it("leaves the dialog closed when open is false", () => {
      const { container } = render(
        <Component open={false}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    });

    /*
      The platform can close the dialog without going through onCancel: close
      watchers make only the FIRST Escape cancelable, so a second press closes
      it over the component's head. The modal reports that close so the
      consumer sets `open` to `false`, as the contract requires — otherwise
      the `open` prop and the DOM desync and the modal can never be reopened.
    */
    it("reports a close the platform performed itself", () => {
      const onOpenChange = vi.fn();
      render(
        <Component open onOpenChange={onOpenChange}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      screen.getByRole("dialog").dispatchEvent(new Event("close"));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("stays quiet when the close came from the open prop", () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <Component open onOpenChange={onOpenChange}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      rerender(
        <Component open={false} onOpenChange={onOpenChange}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("header", () => {
    it("names the dialog with the composed title", () => {
      render(
        <Component open>
          <Component.Header>Delete instance</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(
        screen.getByRole("dialog", { name: "Delete instance" }),
      ).toBeInTheDocument();
    });

    it("renders a close button by default", () => {
      render(
        <Component open>
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("requests close through the modal when the close button is pressed", () => {
      const onOpenChange = vi.fn();
      render(
        <Component open onOpenChange={onOpenChange}>
          <Component.Header>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      screen.getByRole("button", { name: "Close" }).click();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("renders no close button when not dismissible", () => {
      render(
        <Component open>
          <Component.Header dismissible={false}>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(
        screen.queryByRole("button", { name: "Close" }),
      ).not.toBeInTheDocument();
    });

    it("uses a custom dismiss label", () => {
      render(
        <Component open>
          <Component.Header dismissLabel="Dismiss">Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      expect(
        screen.getByRole("button", { name: "Dismiss" }),
      ).toBeInTheDocument();
    });

    it("prefers an explicit onDismiss over the modal's", () => {
      const onOpenChange = vi.fn();
      const onDismiss = vi.fn();
      render(
        <Component open onOpenChange={onOpenChange}>
          <Component.Header onDismiss={onDismiss}>Title</Component.Header>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      screen.getByRole("button", { name: "Close" }).click();
      expect(onDismiss).toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("backdrop", () => {
    it("requests close on a click that lands on the dialog itself", () => {
      const onOpenChange = vi.fn();
      render(
        <Component open closeOnBackdropClick onOpenChange={onOpenChange}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      screen.getByRole("dialog").click();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("ignores backdrop clicks by default", () => {
      const onOpenChange = vi.fn();
      render(
        <Component open onOpenChange={onOpenChange}>
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      screen.getByRole("dialog").click();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ignores backdrop clicks when closeOnBackdropClick is false", () => {
      const onOpenChange = vi.fn();
      render(
        <Component
          open
          closeOnBackdropClick={false}
          onOpenChange={onOpenChange}
        >
          <Component.Content>Body</Component.Content>
        </Component>,
      );
      screen.getByRole("dialog").click();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ignores clicks inside the content pane", () => {
      const onOpenChange = vi.fn();
      render(
        <Component open closeOnBackdropClick onOpenChange={onOpenChange}>
          <Component.Content>Placeholder content</Component.Content>
        </Component>,
      );
      screen.getByText("Placeholder content").click();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
