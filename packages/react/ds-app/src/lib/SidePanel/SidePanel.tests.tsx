import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import SidePanel from "./SidePanel.js";
import type { SidePanelHandle } from "./types.js";

/*
  jsdom 28 implements no part of the dialog API — `show`, `showModal` and
  `close` are all `undefined` (verified against this package's jsdom). These
  stubs are the minimum the component needs: reflect the `open` attribute, and
  dispatch `close` the way the platform does, so every close funnels through
  the dialog's `close` event as it does in a browser.
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

/** Opens the panel through its handle, the only way it opens now. */
const openPanel = (handle: SidePanelHandle | null): void => {
  if (!handle) throw new Error("SidePanel exposed no handle");
  handle.open();
};

describe("SidePanel", () => {
  describe("rendering", () => {
    it("applies the base and custom class to the dialog", () => {
      const { container } = render(
        <SidePanel className="custom-class">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);
      expect(dialog.className).toContain("ds side-panel");
      expect(dialog.className).toContain("custom-class");
    });

    it("renders closed until opened through its handle", () => {
      const handle = createRef<SidePanelHandle>();
      const { container } = render(
        <SidePanel ref={handle}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(getDialog(container)).not.toHaveAttribute("open");

      openPanel(handle.current);
      expect(getDialog(container)).toHaveAttribute("open");
    });

    it("renders the composed parts", () => {
      const handle = createRef<SidePanelHandle>();
      render(
        <SidePanel ref={handle}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
          <SidePanel.Footer>Actions</SidePanel.Footer>
        </SidePanel>,
      );
      // Open so the parts are visible: a closed dialog is `display: none`,
      // and role queries skip hidden elements.
      openPanel(handle.current);
      expect(
        screen.getByRole("heading", { name: "Panel title" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Body")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("passes through additional props", () => {
      render(
        <SidePanel data-testid="test-component">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(screen.getByTestId("test-component")).toBeInTheDocument();
    });
  });

  describe("handle", () => {
    it("exposes the handle to a consumer ref object", () => {
      const consumerRef = createRef<SidePanelHandle>();
      const { container } = render(
        <SidePanel ref={consumerRef}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(typeof consumerRef.current?.open).toBe("function");
      expect(typeof consumerRef.current?.close).toBe("function");
      expect(consumerRef.current?.element).toBe(getDialog(container));
    });

    it("calls a consumer callback ref with the handle", () => {
      const consumerRef = vi.fn();
      render(
        <SidePanel ref={consumerRef}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(consumerRef).toHaveBeenCalledWith(
        expect.objectContaining({
          open: expect.any(Function),
          close: expect.any(Function),
        }),
      );
    });

    it("opens and closes the dialog", () => {
      const handle = createRef<SidePanelHandle>();
      const { container } = render(
        <SidePanel ref={handle} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);

      openPanel(handle.current);
      expect(dialog).toHaveAttribute("open");

      handle.current?.close();
      expect(dialog).not.toHaveAttribute("open");
    });

    it("is a no-op when opening twice or closing a closed panel", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );

      handle.current?.close();
      expect(onOpenChange).not.toHaveBeenCalled();

      openPanel(handle.current);
      openPanel(handle.current);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("focus", () => {
    it("moves focus into the panel when it opens", () => {
      const handle = createRef<SidePanelHandle>();
      const { container } = render(
        <SidePanel ref={handle} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      expect(document.activeElement).toBe(getDialog(container));
    });

    it("hands focus back when it closes while focus is inside it", () => {
      // Stands in for the trigger that opened the panel.
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      const handle = createRef<SidePanelHandle>();
      render(
        <SidePanel ref={handle} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      expect(document.activeElement).not.toBe(trigger);

      handle.current?.close();
      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it("hands focus back when it unmounts while still open", () => {
      // Stands in for the trigger that opened the panel. Outside the render
      // tree so React's cleanup does not remove it before focus returns.
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      const handle = createRef<SidePanelHandle>();
      const { unmount } = render(
        <SidePanel ref={handle} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      expect(document.activeElement).not.toBe(trigger);

      // A consumer rendering `{isOpen && <SidePanel …/>}` closes the panel this
      // way — the handle never runs, so only the unmount path can restore
      // focus.
      unmount();
      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });
  });

  describe("reporting", () => {
    it("reports both directions of a change made through the handle", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );

      openPanel(handle.current);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);

      handle.current?.close();
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(onOpenChange).toHaveBeenCalledTimes(2);
    });

    it("reports a close the platform initiated, so consumers cannot desync", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      onOpenChange.mockClear();

      // A path that bypasses the handle entirely — the raw element, or a
      // `<form method="dialog">` inside the content. The panel still reports.
      getDialog(container).close();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("escape", () => {
    it("closes on Escape from inside the panel", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.keyDown(getDialog(container), { key: "Escape" });
      expect(getDialog(container)).not.toHaveAttribute("open");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("ignores Escape when closeOnEscape is false", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel
          ref={handle}
          onOpenChange={onOpenChange}
          closeOnEscape={false}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.keyDown(getDialog(container), { key: "Escape" });
      expect(getDialog(container)).toHaveAttribute("open");
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("ignores other keys", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.keyDown(getDialog(container), { key: "Enter" });
      expect(getDialog(container)).toHaveAttribute("open");
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("outside press", () => {
    it("stays open by default, because the page behind is interactive", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      render(
        <SidePanel ref={handle} onOpenChange={onOpenChange} aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.pointerDown(document.body);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("closes when closeOnOutsideClick is set", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel
          ref={handle}
          onOpenChange={onOpenChange}
          closeOnOutsideClick={true}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.pointerDown(document.body);
      expect(getDialog(container)).not.toHaveAttribute("open");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("ignores a press that lands inside the panel", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      render(
        <SidePanel
          ref={handle}
          onOpenChange={onOpenChange}
          closeOnOutsideClick={true}
          aria-label="Panel"
        >
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.pointerDown(screen.getByText("Body"));
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("ignores a press while closed", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      render(
        <SidePanel
          ref={handle}
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
      const handle = createRef<SidePanelHandle>();
      const { container } = render(
        <SidePanel ref={handle}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      // Open so the heading is visible: a closed dialog is `display: none`,
      // and role queries skip hidden elements.
      openPanel(handle.current);
      const heading = screen.getByRole("heading", { name: "Panel title" });
      expect(getDialog(container)).toHaveAttribute(
        "aria-labelledby",
        heading.id,
      );
    });

    it("defers to a consumer aria-label, rather than pointing at nothing", () => {
      const { container } = render(
        <SidePanel aria-label="Filters">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      const dialog = getDialog(container);
      expect(dialog).toHaveAttribute("aria-label", "Filters");
      expect(dialog).not.toHaveAttribute("aria-labelledby");
    });

    it("carries no aria-modal: the page behind is not inert", () => {
      const { container } = render(
        <SidePanel aria-label="Panel">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      expect(getDialog(container)).not.toHaveAttribute("aria-modal");
    });

    it("warns when a panel opens with neither a header nor a label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const handle = createRef<SidePanelHandle>();
      render(
        <SidePanel ref={handle}>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      // `aria-labelledby` would point at an id nothing rendered, leaving the
      // dialog unnamed — invisible in the markup, so it is said out loud.
      openPanel(handle.current);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("no accessible name"),
      );
      warn.mockRestore();
    });

    it("stays quiet when a header names the panel", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const handle = createRef<SidePanelHandle>();
      render(
        <SidePanel ref={handle}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("stays quiet when the consumer supplies a label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const handle = createRef<SidePanelHandle>();
      render(
        <SidePanel ref={handle} aria-label="Filters">
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("dismissal from the header", () => {
    it("closes the panel when the header's close button is pressed", () => {
      const handle = createRef<SidePanelHandle>();
      const onOpenChange = vi.fn();
      const { container } = render(
        <SidePanel ref={handle} onOpenChange={onOpenChange}>
          <SidePanel.Header>Panel title</SidePanel.Header>
          <SidePanel.Content>Body</SidePanel.Content>
        </SidePanel>,
      );
      openPanel(handle.current);

      fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
      expect(getDialog(container)).not.toHaveAttribute("open");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
  });
});
