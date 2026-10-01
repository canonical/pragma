import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Component from "./IconButton.js";

describe("IconButton component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders a Button with the icon-button class", () => {
      render(<Component icon="edit" aria-label="Edit" />);
      const button = screen.getByRole("button", { name: "Edit" });
      expect(button).toHaveClass("ds", "button", "icon-button");
    });

    it("renders the icon in Button's icon slot and no label", () => {
      const { container } = render(<Component icon="edit" aria-label="Edit" />);
      const button = container.querySelector("button");
      expect(button?.querySelector(":scope > .icon")).toBeInTheDocument();
      expect(button?.querySelector(":scope > .label")).not.toBeInTheDocument();
    });

    it("merges a consumer className", () => {
      render(<Component icon="edit" aria-label="Edit" className="custom" />);
      expect(screen.getByRole("button")).toHaveClass(
        "ds",
        "button",
        "icon-button",
        "custom",
      );
    });
  });

  describe("inherited Button props", () => {
    it("defaults to the primary importance", () => {
      render(<Component icon="edit" aria-label="Edit" />);
      expect(screen.getByRole("button")).toHaveClass("primary");
    });

    it("applies importance and anticipation", () => {
      render(
        <Component
          icon="delete"
          aria-label="Delete"
          importance="tertiary"
          anticipation="destructive"
        />,
      );
      expect(screen.getByRole("button")).toHaveClass("tertiary", "destructive");
    });

    it("can be disabled", () => {
      render(<Component icon="edit" aria-label="Edit" disabled />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows Button's loading state", () => {
      const { container } = render(
        <Component icon="edit" aria-label="Saving" loading />,
      );
      const button = screen.getByRole("button", { name: "Saving" });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toBeDisabled();
      expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
    });

    it("passes native button attributes and handlers through", () => {
      const onClick = vi.fn();
      render(
        <Component
          icon="edit"
          aria-label="Edit"
          type="submit"
          data-testid="icon-button"
          onClick={onClick}
        />,
      );
      const button = screen.getByTestId("icon-button");
      expect(button).toHaveAttribute("type", "submit");
      button.click();
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("accessibility", () => {
    it("is named by aria-label", () => {
      render(<Component icon="close" aria-label="Close" />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("is named by aria-labelledby", () => {
      render(
        <>
          <span id="close-label">Close dialog</span>
          <Component icon="close" aria-labelledby="close-label" />
        </>,
      );
      expect(
        screen.getByRole("button", { name: "Close dialog" }),
      ).toBeInTheDocument();
    });

    it("requires an accessible name and forbids children at the type level", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      // @ts-expect-error — neither aria-label nor aria-labelledby is given.
      render(<Component icon="edit" />);
      render(
        // @ts-expect-error — an icon button has no visible children.
        <Component icon="edit" aria-label="Edit">
          Edit
        </Component>,
      );
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });

    it("does not trigger Button's missing-name warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<Component icon="close" aria-label="Close" />);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
