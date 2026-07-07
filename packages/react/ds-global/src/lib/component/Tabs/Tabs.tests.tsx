import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LinkComponentProps } from "../../types/link.js";
import Tabs from "./Tabs.js";
import type { TabItem } from "./types.js";

const root: TabItem = {
  key: "root",
  items: [
    { url: "/overview", label: "Overview" },
    { url: "/specs", label: "Specs" },
    { url: "/reviews", label: "Reviews" },
  ],
};

describe("Tabs", () => {
  it("renders a navigation landmark with its accessible name", () => {
    render(<Tabs aria-label="Sections" navigationRoot={root} />);
    expect(
      screen.getByRole("navigation", { name: "Sections" }),
    ).toBeInTheDocument();
  });

  it("renders one tab per direct child of the navigation root", () => {
    render(<Tabs aria-label="Sections" navigationRoot={root} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/overview",
    );
  });

  it("does not render the root node itself, only its children", () => {
    render(
      <Tabs
        aria-label="Sections"
        navigationRoot={{ label: "Root label", items: root.items }}
      />,
    );
    expect(screen.queryByText("Root label")).not.toBeInTheDocument();
  });

  it("marks the tab matching currentUrl as active", () => {
    render(
      <Tabs aria-label="Sections" navigationRoot={root} currentUrl="/specs" />,
    );
    expect(screen.getByRole("link", { name: "Specs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders an item without a url as inert text, not a link", () => {
    render(
      <Tabs
        aria-label="Sections"
        navigationRoot={{ items: [{ key: "soon", label: "Coming soon" }] }}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Coming soon").tagName).toBe("SPAN");
  });

  it("renders navigable tabs through a custom LinkComponent", () => {
    const CustomLink = vi.fn(
      ({ href, children }: LinkComponentProps): ReactNode => (
        <a href={href} data-custom>
          {children}
        </a>
      ),
    );
    render(
      <Tabs
        aria-label="Sections"
        navigationRoot={root}
        LinkComponent={CustomLink}
      />,
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "data-custom",
    );
    expect(CustomLink).toHaveBeenCalled();
  });

  it("applies custom classNames to the nav and list", () => {
    render(
      <Tabs
        aria-label="Sections"
        navigationRoot={root}
        className="custom-nav"
        listClassName="custom-list"
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.className).toContain("ds tabs");
    expect(nav.className).toContain("custom-nav");
    expect(nav.querySelector(".tabs-list")?.className).toContain("custom-list");
  });

  it("renders an empty strip when the root has no children", () => {
    render(<Tabs aria-label="Sections" navigationRoot={{ key: "empty" }} />);
    expect(
      screen.getByRole("navigation", { name: "Sections" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
