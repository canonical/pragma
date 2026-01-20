import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Breadcrumbs from "./Breadcrumbs.js";

describe("Breadcrumbs", () => {
  it("renders children", () => {
    render(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/products">Products</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders as nav element with aria-label", () => {
    render(
      <Breadcrumbs data-testid="nav">
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const nav = screen.getByTestId("nav");
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("aria-label", "Breadcrumb");
  });

  it("allows custom aria-label", () => {
    render(
      <Breadcrumbs aria-label="Site navigation" data-testid="nav">
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(screen.getByTestId("nav")).toHaveAttribute(
      "aria-label",
      "Site navigation",
    );
  });

  it("applies ds breadcrumbs class", () => {
    render(
      <Breadcrumbs data-testid="nav">
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(screen.getByTestId("nav")).toHaveClass("ds", "breadcrumbs");
  });

  it("renders Item with link", () => {
    render(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/test">Test Link</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const link = screen.getByText("Test Link");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/test");
  });

  it("renders current Item without link", () => {
    render(
      <Breadcrumbs>
        <Breadcrumbs.Item current>Current Page</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const current = screen.getByText("Current Page");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders separator between items", () => {
    render(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item current>Page</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const separators = screen.getAllByText("/");
    // First item has visible separator, last item's separator is hidden via CSS
    expect(separators[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("maintains DOM order: link before separator", () => {
    render(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/" data-testid="item">
          Home
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const item = screen.getByTestId("item");
    const children = item.children;
    expect(children[0]).toHaveClass("breadcrumbs-item-link");
    expect(children[1]).toHaveClass("breadcrumbs-item-separator");
  });
});
