import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import Item from "./Item.js";

const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>);

describe("Tabs Item (internal renderer)", () => {
  it("renders a navigable item as a link with its url", () => {
    inList(
      <Item
        item={{ url: "/specs", label: "Specs" }}
        active={false}
        LinkComponent="a"
      />,
    );
    expect(screen.getByRole("link", { name: "Specs" })).toHaveAttribute(
      "href",
      "/specs",
    );
  });

  it("renders an item without a url as inert text (a span), marked data-inert", () => {
    inList(
      <Item item={{ label: "Coming soon" }} active={false} LinkComponent="a" />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Coming soon").tagName).toBe("SPAN");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-inert");
  });

  it("marks the active item with aria-current=page and data-active", () => {
    inList(<Item item={{ url: "/a", label: "A" }} active LinkComponent="a" />);
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("listitem")).toHaveAttribute("data-active");
  });

  it("omits href for a disabled item", () => {
    inList(
      <Item
        item={{ url: "/a", label: "A", disabled: true }}
        active={false}
        LinkComponent="a"
      />,
    );
    expect(screen.getByText("A").closest("a")).not.toHaveAttribute("href");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-disabled");
  });
});
