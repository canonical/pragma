import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SideNavigation from "./SideNavigation.js";
import type { NavItem } from "./types.js";

// Level-1 items are groups; navigable links live at level 2. Here a single
// unlabelled group holds the links (no header rendered).
const root: NavItem = {
  key: "root",
  items: [
    {
      key: "main",
      items: [
        { url: "/machines", label: "Machines" },
        { url: "/devices", label: "Devices" },
      ],
    },
  ],
};

const footerRoot: NavItem = {
  key: "footer",
  items: [
    { key: "footer-group", items: [{ url: "/settings", label: "Settings" }] },
  ],
};

describe("SideNavigation", () => {
  it("renders the root items in the content region", () => {
    render(<SideNavigation root={root} />);
    expect(screen.getByText("Machines")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(
      <SideNavigation root={root} className="custom-class" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation");
    expect(el?.className).toContain("custom-class");
  });

  it("renders the brand in the header", () => {
    render(<SideNavigation root={root} brand={<span>Acme</span>} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the footer items when footerRoot is provided", () => {
    render(<SideNavigation root={root} footerRoot={footerRoot} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks the currentUrl item as the current page", () => {
    render(<SideNavigation root={root} currentUrl="/devices" />);
    const active = screen.getByRole("link", { name: "Devices" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Machines" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("toggles expanded state (uncontrolled) and reflects it on the root", () => {
    const { container } = render(<SideNavigation root={root} />);
    const el = container.firstElementChild as HTMLElement;
    const toggle = screen.getByRole("button");

    expect(el.dataset.expanded).toBe("true");
    expect(el.className).not.toContain("collapsed");

    fireEvent.click(toggle);
    expect(el.dataset.expanded).toBe("false");
    expect(el.className).toContain("collapsed");
  });

  it("wires the toggle's aria-controls to the content region", () => {
    render(<SideNavigation root={root} />);
    const toggle = screen.getByRole("button");
    const controlledId = toggle.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
    expect(document.getElementById(controlledId as string)).toContainElement(
      screen.getByText("Machines"),
    );
  });

  // Controlled mode is not the official circuit yet — only uncontrolled is
  // supported. Kept here for when the controlled path is enabled.
  // it("calls onExpandedChange with the next state when controlled", () => {
  //   const onExpandedChange = vi.fn();
  //   render(
  //     <SideNavigation root={root} expanded onExpandedChange={onExpandedChange} />,
  //   );
  //   fireEvent.click(screen.getByRole("button"));
  //   expect(onExpandedChange).toHaveBeenCalledWith(false);
  // });
});
