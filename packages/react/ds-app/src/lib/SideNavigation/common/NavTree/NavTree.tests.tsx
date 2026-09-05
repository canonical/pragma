import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NavRoot } from "../../types.js";
import NavTree from "./NavTree.js";

describe("NavTree", () => {
  it("renders a group header and its link entries", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "hardware",
          label: "Hardware",
          items: [{ url: "/machines", label: "Machines" }],
        },
      ],
    };
    render(<NavTree root={root} />);
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Machines" })).toHaveAttribute(
      "href",
      "/machines",
    );
  });

  it("renders a separator between groups", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        { key: "one-group", items: [{ url: "/one", label: "One" }] },
        { key: "sep", separator: true },
        { key: "two-group", items: [{ url: "/two", label: "Two" }] },
      ],
    };
    const { container } = render(<NavTree root={root} />);
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("dispatches control: button to ItemButton", () => {
    const onClick = vi.fn();
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "account",
          items: [
            { key: "logout", label: "Log out", control: "button", onClick },
          ],
        },
      ],
    };
    render(<NavTree root={root} />);
    const button = screen.getByRole("button", { name: "Log out" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("dispatches control: switch to ItemSwitch", () => {
    const onCheckedChange = vi.fn();
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "preferences",
          items: [
            {
              key: "dark-mode",
              label: "Dark mode",
              control: "switch",
              checked: false,
              onCheckedChange,
            },
          ],
        },
      ],
    };
    render(<NavTree root={root} />);
    const switchEl = screen.getByRole("switch", { name: "Dark mode" });
    fireEvent.click(switchEl);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders an expandable entry as a disclosure with leaf children", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "main",
          items: [
            {
              key: "hardware",
              label: "Hardware",
              items: [{ url: "/machines", label: "Machines" }],
            },
          ],
        },
      ],
    };
    const { container } = render(<NavTree root={root} />);
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(container.querySelector("details")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Machines" })).toBeInTheDocument();
  });

  it("marks the currentUrl entry as active", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "main",
          items: [
            { url: "/one", label: "One" },
            { url: "/two", label: "Two" },
          ],
        },
      ],
    };
    render(<NavTree root={root} currentUrl="/two" />);
    expect(screen.getByRole("link", { name: "Two" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
