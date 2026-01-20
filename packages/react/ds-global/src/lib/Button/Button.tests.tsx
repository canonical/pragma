import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Button.js";

describe("Button component", () => {
  describe("rendering", () => {
    it("renders with children", () => {
      render(<Component>Hello world!</Component>);
      expect(screen.getByText("Hello world!")).toBeInTheDocument();
    });

    it("renders without children", () => {
      render(<Component aria-label="Empty button" />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("applies base classes", () => {
      render(<Component>Test</Component>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("ds", "button");
    });
  });

  describe("className prop", () => {
    it("applies custom className", () => {
      render(<Component className="test-class">Hello world!</Component>);
      expect(screen.getByRole("button")).toHaveClass("test-class");
    });

    it("preserves base classes with custom className", () => {
      render(<Component className="custom">Test</Component>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("ds", "button", "custom");
    });
  });

  describe("importance modifier", () => {
    it("applies primary importance class", () => {
      render(<Component importance="primary">Primary</Component>);
      expect(screen.getByRole("button")).toHaveClass("primary");
    });

    it("applies secondary importance class", () => {
      render(<Component importance="secondary">Secondary</Component>);
      expect(screen.getByRole("button")).toHaveClass("secondary");
    });

    it("applies tertiary importance class", () => {
      render(<Component importance="tertiary">Tertiary</Component>);
      expect(screen.getByRole("button")).toHaveClass("tertiary");
    });
  });

  describe("anticipation modifier", () => {
    it("applies constructive anticipation class", () => {
      render(<Component anticipation="constructive">Save</Component>);
      expect(screen.getByRole("button")).toHaveClass("constructive");
    });

    it("applies caution anticipation class", () => {
      render(<Component anticipation="caution">Warning</Component>);
      expect(screen.getByRole("button")).toHaveClass("caution");
    });

    it("applies destructive anticipation class", () => {
      render(<Component anticipation="destructive">Delete</Component>);
      expect(screen.getByRole("button")).toHaveClass("destructive");
    });
  });

  describe("orthogonal modifiers", () => {
    it("applies both importance and anticipation classes", () => {
      render(
        <Component importance="primary" anticipation="destructive">
          Delete Account
        </Component>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("primary", "destructive");
    });
  });

  describe("variant prop", () => {
    it("applies link variant class", () => {
      render(<Component variant="link">Learn more</Component>);
      expect(screen.getByRole("button")).toHaveClass("link");
    });
  });

  describe("icon prop", () => {
    it("renders icon at start position by default", () => {
      const icon = <span data-testid="icon">+</span>;
      render(<Component icon={icon}>Add</Component>);

      const button = screen.getByRole("button");
      const iconElement = screen.getByTestId("icon");
      const labelElement = screen.getByText("Add");

      // Icon should come before label in DOM order
      expect(button.firstChild).toContainElement(iconElement);
      expect(labelElement).toBeInTheDocument();
    });

    it("renders icon at end position", () => {
      const icon = <span data-testid="icon">→</span>;
      render(
        <Component icon={icon} iconPosition="end">
          Continue
        </Component>
      );

      const button = screen.getByRole("button");
      const iconElement = screen.getByTestId("icon");

      // Text should come before icon in DOM order
      expect(button.textContent).toBe("Continue→");
      expect(iconElement).toBeInTheDocument();
    });

    it("renders icon-only button", () => {
      const icon = <span data-testid="icon">×</span>;
      render(<Component icon={icon} aria-label="Close" />);

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close");
    });

    it("wraps icon in icon class", () => {
      const icon = <span data-testid="icon">+</span>;
      render(<Component icon={icon}>Add</Component>);

      const iconWrapper = screen.getByTestId("icon").parentElement;
      expect(iconWrapper).toHaveClass("icon");
    });
  });

  describe("accessibility", () => {
    it("uses children as aria-label when children is string", () => {
      render(<Component>Submit</Component>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Submit");
    });

    it("uses explicit aria-label over children", () => {
      render(<Component aria-label="Submit form">Submit</Component>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Submit form"
      );
    });

    it("does not set aria-label when children is not a string and no aria-label provided", () => {
      render(
        <Component>
          <span>Complex content</span>
        </Component>
      );
      // aria-label should be undefined (not set) when children is not a string
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-label");
    });
  });

  describe("disabled state", () => {
    it("can be disabled", () => {
      render(<Component disabled>Disabled</Component>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("HTML attributes", () => {
    it("passes through HTML button attributes", () => {
      render(
        <Component type="submit" name="submitBtn" value="submit">
          Submit
        </Component>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
      expect(button).toHaveAttribute("name", "submitBtn");
      expect(button).toHaveAttribute("value", "submit");
    });

    it("applies id prop", () => {
      render(<Component id="my-button">Test</Component>);
      expect(screen.getByRole("button")).toHaveAttribute("id", "my-button");
    });

    it("applies style prop", () => {
      render(<Component style={{ color: "red" }}>Test</Component>);
      expect(screen.getByRole("button")).toHaveStyle({ color: "rgb(255, 0, 0)" });
    });
  });
});
