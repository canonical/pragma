import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip } from "../Chip/index.js";
import Component from "./Card.js";

describe("Card component", () => {
  it("renders", () => {
    render(<Component>Card</Component>);
    expect(screen.getByText("Card")).toBeInTheDocument();
  });

  it("renders a full composition with the header adjacent to the content", () => {
    const { container } = render(
      <Component>
        <Component.Image src="test.png" />
        <Component.Header>Title</Component.Header>
        <Component.Content>Body</Component.Content>
        <Component.Footer>
          <Chip value="tag" />
        </Component.Footer>
      </Component>,
    );

    const header = screen.getByText("Title");
    expect(header).toHaveClass("card-header");
    // The header is not a separate visual section: it merges with the content
    // that follows (the seam-collapse selector targets this adjacency).
    expect(header.nextElementSibling).toHaveClass("card-content");
    expect(screen.getByText("Body")).toHaveClass("card-content");
    // Footer carries tags and labels (e.g. Chip), not CTAs or links.
    expect(screen.getByText("tag")).toBeInTheDocument();
    expect(container.querySelector(".card-footer a")).toBeNull();
  });
});
