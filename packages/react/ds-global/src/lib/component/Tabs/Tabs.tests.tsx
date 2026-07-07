import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkComponentProps } from "../../types/link.js";
import Tabs from "./Tabs.js";

describe("Tabs", () => {
  it("renders a navigation landmark with its accessible name", () => {
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="#overview">Overview</Tabs.Tab>
      </Tabs>,
    );
    expect(
      screen.getByRole("navigation", { name: "Sections" }),
    ).toBeInTheDocument();
  });

  it("renders each tab as a list item", () => {
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="#a">A</Tabs.Tab>
        <Tabs.Tab href="#b">B</Tabs.Tab>
      </Tabs>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders a navigable tab as a link with its href", () => {
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="/specs">Specs</Tabs.Tab>
      </Tabs>,
    );
    expect(screen.getByRole("link", { name: "Specs" })).toHaveAttribute(
      "href",
      "/specs",
    );
  });

  it("marks the active tab with aria-current=page", () => {
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="#a" active>
          A
        </Tabs.Tab>
        <Tabs.Tab href="#b">B</Tabs.Tab>
      </Tabs>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "B" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders a tab without an href as inert text, not a link", () => {
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab>Disabled section</Tabs.Tab>
      </Tabs>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Disabled section").tagName).toBe("SPAN");
  });

  it("renders a navigable tab through a custom LinkComponent", () => {
    const CustomLink = vi.fn(({ href, children }: LinkComponentProps) => (
      <a href={href} data-custom>
        {children}
      </a>
    ));
    render(
      <Tabs aria-label="Sections">
        <Tabs.Tab href="/a" LinkComponent={CustomLink}>
          A
        </Tabs.Tab>
      </Tabs>,
    );
    const link = screen.getByRole("link", { name: "A" });
    expect(link).toHaveAttribute("data-custom");
    expect(CustomLink).toHaveBeenCalled();
  });

  it("applies custom classNames to the nav and list", () => {
    render(
      <Tabs
        aria-label="Sections"
        className="custom-nav"
        listClassName="custom-list"
      >
        <Tabs.Tab href="#a">A</Tabs.Tab>
      </Tabs>,
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.className).toContain("ds tabs");
    expect(nav.className).toContain("custom-nav");
    expect(nav.querySelector(".tabs-list")?.className).toContain("custom-list");
  });
});
