import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SecondaryNavRoot } from "../../types.js";
import Secondary from "./Secondary.js";

const root: SecondaryNavRoot = {
  key: "root",
  items: [
    {
      key: "group",
      label: "General",
      items: [{ url: "/settings/profile", label: "Profile" }],
    },
  ],
};

describe("Secondary", () => {
  it("renders as its own nav landmark", () => {
    render(<Secondary title="Account settings" root={root} />);
    expect(
      screen.getByRole("navigation", { name: "Account settings" }),
    ).toBeInTheDocument();
  });

  it("allows overriding the default aria-label", () => {
    render(
      <Secondary
        title="Account settings"
        root={root}
        aria-label="Settings navigation"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Settings navigation" }),
    ).toBeInTheDocument();
  });

  it("renders the title in its header", () => {
    render(<Secondary title="Account settings" root={root} />);
    expect(screen.getByText("Account settings")).toBeInTheDocument();
  });

  it("renders the root's items via Content", () => {
    render(<Secondary title="Account settings" root={root} />);
    expect(
      screen.getByText("General", {
        selector: ".ds.side-navigation-group-header",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/settings/profile",
    );
  });

  it("marks the currentUrl item as active", () => {
    render(
      <Secondary
        title="Account settings"
        root={root}
        currentUrl="/settings/profile"
      />,
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("applies the base and custom class", () => {
    const { container } = render(
      <Secondary
        title="Account settings"
        root={root}
        className="custom-class"
      />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-secondary");
    expect(el?.className).toContain("custom-class");
  });
});
