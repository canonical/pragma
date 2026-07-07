import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import type { LinkComponentProps } from "../../../../types/link.js";
import Tab from "./Tab.js";

const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>);

describe("Tabs.Tab", () => {
  it("renders a navigable tab as a link with its href", () => {
    inList(<Tab href="/specs">Specs</Tab>);
    expect(screen.getByRole("link", { name: "Specs" })).toHaveAttribute(
      "href",
      "/specs",
    );
  });

  it("renders as inert text (a span) when no href is given", () => {
    inList(<Tab>Coming soon</Tab>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Coming soon").tagName).toBe("SPAN");
  });

  it("marks the active tab with aria-current=page", () => {
    inList(
      <Tab href="/a" active>
        A
      </Tab>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not set aria-current when inactive", () => {
    inList(<Tab href="/a">A</Tab>);
    expect(screen.getByRole("link", { name: "A" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders through a custom LinkComponent", () => {
    const CustomLink = vi.fn(({ href, children }: LinkComponentProps) => (
      <a href={href} data-custom>
        {children}
      </a>
    ));
    inList(
      <Tab href="/a" LinkComponent={CustomLink}>
        A
      </Tab>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "data-custom",
    );
    expect(CustomLink).toHaveBeenCalled();
  });

  it("applies className to the item and linkClassName to the link", () => {
    inList(
      <Tab href="/a" className="custom-item" linkClassName="custom-link">
        A
      </Tab>,
    );
    const item = screen.getByRole("listitem");
    expect(item.className).toContain("ds tabs-item");
    expect(item.className).toContain("custom-item");
    expect(screen.getByRole("link", { name: "A" }).className).toContain(
      "custom-link",
    );
  });
});
