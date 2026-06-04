import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SideNavigation from "./SideNavigation.js";

describe("SideNavigation", () => {
  it("renders children in the content region", () => {
    render(<SideNavigation>Test content</SideNavigation>);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(
      <SideNavigation className="custom-class">Content</SideNavigation>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("ds side-navigation");
    expect(root?.className).toContain("custom-class");
  });

  it("renders the brand in the header", () => {
    render(<SideNavigation brand={<span>Acme</span>}>Content</SideNavigation>);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the footer when provided", () => {
    render(<SideNavigation footer={<span>Account</span>}>Content</SideNavigation>);
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("toggles expanded state (uncontrolled) and reflects it on the root", () => {
    const { container } = render(<SideNavigation>Content</SideNavigation>);
    const root = container.firstElementChild as HTMLElement;
    const toggle = screen.getByRole("button");

    // Defaults to expanded.
    expect(root.dataset.expanded).toBe("true");
    expect(root.className).not.toContain("collapsed");

    fireEvent.click(toggle);
    expect(root.dataset.expanded).toBe("false");
    expect(root.className).toContain("collapsed");
  });

  // Controlled mode is not the official circuit yet — only uncontrolled is
  // supported. Kept here for when the controlled path is enabled.
  // it("calls onExpandedChange with the next state when controlled", () => {
  //   const onExpandedChange = vi.fn();
  //   render(
  //     <SideNavigation expanded onExpandedChange={onExpandedChange}>
  //       Content
  //     </SideNavigation>,
  //   );
  //   fireEvent.click(screen.getByRole("button"));
  //   expect(onExpandedChange).toHaveBeenCalledWith(false);
  // });

  it("wires the toggle's aria-controls to the content region", () => {
    render(<SideNavigation>Content</SideNavigation>);
    const toggle = screen.getByRole("button");
    const controlledId = toggle.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
    expect(document.getElementById(controlledId as string)).toHaveTextContent(
      "Content",
    );
  });
});
