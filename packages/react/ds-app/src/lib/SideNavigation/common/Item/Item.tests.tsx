import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import Item from "./Item.js";

describe("Item", () => {
  it("renders a link when url is set", () => {
    render(<Item url="/machines">Machines</Item>);
    expect(screen.getByRole("link", { name: "Machines" })).toHaveAttribute(
      "href",
      "/machines",
    );
  });

  it("renders a plain label when url is absent", () => {
    render(<Item>Ada Lovelace</Item>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("marks the active item with aria-current", () => {
    render(
      <Item url="/machines" active>
        Machines
      </Item>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("omits href when disabled", () => {
    const { container } = render(
      <Item url="/machines" disabled>
        Machines
      </Item>,
    );
    // An <a> without href has no accessible "link" role — the disabled
    // fallback correctly renders a non-navigable element.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const anchor = container.querySelector("a.row");
    expect(anchor).toBeInTheDocument();
    expect(anchor).not.toHaveAttribute("href");
  });

  it("renders the trailing slot", () => {
    render(
      <Item url="/machines" slot={<span>42</span>}>
        Machines
      </Item>,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders through a custom LinkComponent", () => {
    const CustomLink = ({
      href,
      children,
    }: {
      href?: string;
      children?: React.ReactNode;
    }) => <a href={`#${href}`}>{children}</a>;
    render(
      <Item url="/machines" LinkComponent={CustomLink}>
        Machines
      </Item>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "#/machines");
  });

  it("applies custom className", () => {
    const { container } = render(
      <Item url="/machines" className="custom-class">
        Machines
      </Item>,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-item");
    expect(el?.className).toContain("custom-class");
  });

  it("sets title on the label as a native tooltip fallback for truncation (SPEC.md §10.17)", () => {
    render(<Item url="/machines">Machines</Item>);
    expect(screen.getByText("Machines")).toHaveAttribute("title", "Machines");
  });

  it("composes rich (non-string) content without setting a title", () => {
    render(
      <Item url="/machines">
        <strong>Machines</strong>
      </Item>,
    );
    const strong = screen.getByText("Machines");
    expect(strong.closest(".label")).not.toHaveAttribute("title");
  });
});
