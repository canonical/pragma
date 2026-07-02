import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Tile from "./Tile.js";

describe("Tile", () => {
  it("renders children", () => {
    render(
      <Tile>
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies ds tile class", () => {
    render(
      <Tile data-testid="tile">
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(screen.getByTestId("tile")).toHaveClass("ds", "tile");
  });

  it("applies custom className", () => {
    render(
      <Tile className="custom" data-testid="tile">
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(screen.getByTestId("tile")).toHaveClass("ds", "tile", "custom");
  });

  it("passes through HTML attributes", () => {
    render(
      <Tile data-testid="my-tile" aria-label="My tile">
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    const tile = screen.getByTestId("my-tile");
    expect(tile).toHaveAttribute("aria-label", "My tile");
  });

  it("renders Header with correct class", () => {
    render(
      <Tile>
        <Tile.Header data-testid="header">Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    expect(screen.getByTestId("header")).toHaveClass("ds", "tile-header");
  });

  it("renders Content with correct class", () => {
    render(
      <Tile>
        <Tile.Header>Header</Tile.Header>
        <Tile.Content data-testid="content">Content</Tile.Content>
      </Tile>,
    );
    expect(screen.getByTestId("content")).toHaveClass("ds", "tile-content");
  });

  it("maintains DOM order: Header before Content", () => {
    render(
      <Tile data-testid="tile">
        <Tile.Header>Header</Tile.Header>
        <Tile.Content>Content</Tile.Content>
      </Tile>,
    );
    const tile = screen.getByTestId("tile");
    const children = tile.children;
    expect(children[0]).toHaveClass("tile-header");
    expect(children[1]).toHaveClass("tile-content");
  });
});
