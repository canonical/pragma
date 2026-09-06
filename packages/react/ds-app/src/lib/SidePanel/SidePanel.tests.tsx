import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import SidePanel from "./SidePanel.js";

/*
  jsdom 28 implements no part of the dialog API — `show`, `showModal` and
  `close` are all `undefined` (verified against this package's jsdom). These
  stubs are the minimum the component needs: reflect the `open` attribute, and
  dispatch `close` the way the platform does, so the desync guard can be
  exercised too.
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
  if (!dialog) throw new Error("SidePanel rendered no dialog element");
  return dialog;
};

describe("SidePanel", () => {
  describe("rendering", () => {
    it("applies the base and custom class to the dialog", () => {
      const { container } = render(
        <SidePanel open={false} onOpenChange={vi.fn()} className="custom-class">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);
      expect(dialog.className).toContain("ds side-panel");
      expect(dialog.className).toContain("custom-class");
    });

    it("renders closed until asked to open", () => {
      const { container } = render(
        <SidePanel open={false} onOpenChange={vi.fn()}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(getDialog(container)).not.toHaveAttribute("open");
    });

    it("renders the composed parts", () => {
      render(
        <SidePanel open={true} onOpenChange={vi.fn()}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
          <SidePanel.Footer>Actions</SidePanel.Footer>
        </SidePanel>,
      );
      expect(
        screen.getByRole("heading", { name: "Panel title" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Body")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("passes through additional props", () => {
      render(
        <SidePanel
          open={false}
          onOpenChange={vi.fn()}
          data-testid="test-component"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(screen.getByTestId("test-component")).toBeInTheDocument();
    });
  });

  describe("consumer ref", () => {
    it("forwards the dialog element to a consumer ref object", () => {
      const consumerRef = createRef<HTMLDialogElement>();
      const { container } = render(
        <SidePanel open={false} onOpenChange={vi.fn()} ref={consumerRef}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(consumerRef.current).toBe(getDialog(container));
    });

    it("calls a consumer callback ref with the dialog element", () => {
      const consumerRef = vi.fn();
      render(
        <SidePanel open={false} onOpenChange={vi.fn()} ref={consumerRef}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(consumerRef).toHaveBeenCalledWith(expect.any(HTMLDialogElement));
    });

    it("keeps the panel's own ref working when a consumer ref is supplied", () => {
      const consumerRef = createRef<HTMLDialogElement>();
      const props = {
        onOpenChange: vi.fn(),
        "aria-label": "Panel",
        ref: consumerRef,
      };
      const { rerender } = render(
        <SidePanel open={false} {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(consumerRef.current).not.toHaveAttribute("open");

      // Opens through the panel's internal ref — which a consumer ref must
      // not displace.
      rerender(
        <SidePanel open={true} {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(consumerRef.current).toHaveAttribute("open");
    });
  });

  describe("open state", () => {
    it("follows the open prop in both directions", () => {
      const props = { onOpenChange: vi.fn() };
      const { container, rerender } = render(
        <SidePanel open={false} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);
      expect(dialog).not.toHaveAttribute("open");

      rerender(
        <SidePanel open={true} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(dialog).toHaveAttribute("open");

      rerender(
        <SidePanel open={false} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(dialog).not.toHaveAttribute("open");
    });

    it("moves focus into the panel when it opens", () => {
      const props = { onOpenChange: vi.fn() };
      const { container, rerender } = render(
        <SidePanel open={false} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      rerender(
        <SidePanel open={true} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(document.activeElement).toBe(getDialog(container));
    });

    it("hands focus back when it unmounts while still open", () => {
      const props = { onOpenChange: vi.fn() };
      // Stands in for the trigger that opened the panel. Outside the render
      // tree so React's cleanup does not remove it before focus returns.
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      const { rerender, unmount } = render(
        <SidePanel open={false} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      rerender(
        <SidePanel open={true} aria-label="Panel" {...props}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(document.activeElement).not.toBe(trigger);

      // A consumer rendering `{isOpen && <SidePanel …/>}` closes the panel this
      // way — `open` never flips, so only the unmount path can restore focus.
      unmount();
      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it("reports a close the platform initiated, so open cannot desync", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel open={true} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      // What a native close request looks like to React: the dialog closes
      // without the consumer's state having changed.
      fireEvent(getDialog(container), new Event("close"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("escape", () => {
    it("asks to close on Escape from inside the panel", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel open={true} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.keyDown(getDialog(container), { key: "Escape" });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("ignores Escape when closeOnEscape is false", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel
          open={true}
          onOpenChange={onOpenChange}
          closeOnEscape={false}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.keyDown(getDialog(container), { key: "Escape" });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ignores other keys", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel open={true} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.keyDown(getDialog(container), { key: "Enter" });
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("outside press", () => {
    it("stays open by default, because the page behind is interactive", () => {
      const onOpenChange = vi.fn();
      render(
        <SidePanel open={true} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.pointerDown(document.body);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("asks to close when closeOnOutsideClick is set", () => {
      const onOpenChange = vi.fn();
      render(
        <SidePanel
          open={true}
          onOpenChange={onOpenChange}
          closeOnOutsideClick={true}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.pointerDown(document.body);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("ignores a press that lands inside the panel", () => {
      const onOpenChange = vi.fn();
      render(
        <SidePanel
          open={true}
          onOpenChange={onOpenChange}
          closeOnOutsideClick={true}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.pointerDown(screen.getByText("Body"));
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("does not listen while closed", () => {
      const onOpenChange = vi.fn();
      render(
        <SidePanel
          open={false}
          onOpenChange={onOpenChange}
          closeOnOutsideClick={true}
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.pointerDown(document.body);
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("accessible name", () => {
    it("is labelled by the header's heading", () => {
      const { container } = render(
        <SidePanel open={true} onOpenChange={vi.fn()}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const heading = screen.getByRole("heading", { name: "Panel title" });
      expect(getDialog(container)).toHaveAttribute(
        "aria-labelledby",
        heading.id,
      );
    });

    it("defers to a consumer aria-label, rather than pointing at nothing", () => {
      const { container } = render(
        <SidePanel open={true} onOpenChange={vi.fn()} aria-label="Filters">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);
      expect(dialog).toHaveAttribute("aria-label", "Filters");
      expect(dialog).not.toHaveAttribute("aria-labelledby");
    });

    it("carries no aria-modal: the page behind is not inert", () => {
      const { container } = render(
        <SidePanel open={true} onOpenChange={vi.fn()} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(getDialog(container)).not.toHaveAttribute("aria-modal");
    });

    it("warns when a panel opens with neither a header nor a label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <SidePanel open={true} onOpenChange={vi.fn()}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      // `aria-labelledby` would point at an id nothing rendered, leaving the
      // dialog unnamed — invisible in the markup, so it is said out loud.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("no accessible name"),
      );
      warn.mockRestore();
    });

    it("stays quiet when a header names the panel", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <SidePanel open={true} onOpenChange={vi.fn()}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("stays quiet when the consumer supplies a label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <SidePanel open={true} onOpenChange={vi.fn()} aria-label="Filters">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("stays quiet while the panel is closed", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <SidePanel open={false} onOpenChange={vi.fn()}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("dismissal from the header", () => {
    it("asks to close when the header's close button is pressed", () => {
      const onOpenChange = vi.fn();
      render(
        <SidePanel open={true} onOpenChange={onOpenChange}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
