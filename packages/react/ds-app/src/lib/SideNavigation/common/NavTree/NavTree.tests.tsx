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

  it("renders a bare separator entry as a divider alone, with no empty group", () => {
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
    // A bare separator (no `items`) must not also render an empty Group —
    // exactly two groups (one/two), not three.
    expect(
      container.querySelectorAll(".ds.side-navigation-group"),
    ).toHaveLength(2);
  });

  it("renders a separator immediately before a group that opts in via its own `separator` flag", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        { key: "one-group", items: [{ url: "/one", label: "One" }] },
        {
          key: "two-group",
          label: "Two",
          separator: true,
          items: [{ url: "/two", label: "Two" }],
        },
      ],
    };
    const { container } = render(<NavTree root={root} />);
    const groups = container.querySelectorAll(".ds.side-navigation-group");
    expect(groups).toHaveLength(2);
    // The separator sits between the two groups, not before the first.
    expect(container.querySelector("hr")?.previousElementSibling).toBe(
      groups[0],
    );
    expect(container.querySelector("hr")?.nextElementSibling).toBe(groups[1]);
  });

  it("does not warn about React keys when rendering separators and groups", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root: NavRoot = {
      key: "root",
      items: [
        { key: "one-group", items: [{ url: "/one", label: "One" }] },
        { key: "sep", separator: true },
        { key: "two-group", items: [{ url: "/two", label: "Two" }] },
      ],
    };
    render(<NavTree root={root} />);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
