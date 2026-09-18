import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Group from "./Group.js";

describe("Group", () => {
  it("renders its children in a list", () => {
    render(
      <Group>
        <li>Machines</li>
      </Group>,
    );
    expect(screen.getByText("Machines")).toBeInTheDocument();
  });

  it("renders a GroupHeader when label is set", () => {
    render(
      <Group label="Hardware">
        <li>Machines</li>
      </Group>,
    );
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("omits the header when label is absent", () => {
    const { container } = render(
      <Group>
        <li>Machines</li>
      </Group>,
    );
    expect(
      container.querySelector(".ds.side-navigation-group-header"),
    ).not.toBeInTheDocument();
  });

  it("applies the base and custom class", () => {
    const { container } = render(<Group className="custom-class" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation-group");
    expect(el?.className).toContain("custom-class");
  });
});
