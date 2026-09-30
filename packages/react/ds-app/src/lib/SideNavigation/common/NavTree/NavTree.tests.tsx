import { render, screen } from "@testing-library/react";
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

  it("does not warn about React keys", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root: NavRoot = {
      key: "root",
      items: [
        { key: "one-group", items: [{ url: "/one", label: "One" }] },
        { key: "two-group", items: [{ url: "/two", label: "Two" }] },
        // Keyed entries whose authored `key` used to ride the spread into
        // Item/ItemExpandable (React 19 spread-key warning): a key-only
        // leaf (no `url`) and a keyed expandable with key-only children.
        { key: "plain-label", label: "Plain" },
        {
          key: "expandable",
          label: "Expandable",
          items: [{ key: "child", label: "Child" }],
        },
      ],
    };
    render(<NavTree root={root} />);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not warn about React keys for keyless label-only entries", () => {
    // `LeafNavItem` leaves `key`/`url` both optional, so a label-only entry
    // yields no `getItemId` — the element key must fall back (label, then
    // index) rather than surface as a missing React key.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "group",
          items: [
            { label: "Anonymous One" },
            { label: "Anonymous Two" },
            // A keyed entry alongside the keyless ones — the fallback must
            // not collide with authored keys either.
            { url: "/one", label: "One" },
          ],
        },
      ],
    };
    render(<NavTree root={root} />);
    expect(screen.getByText("Anonymous One")).toBeInTheDocument();
    expect(screen.getByText("Anonymous Two")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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

  it("marks a nested sub-item active under its expanded expandable parent", () => {
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "main",
          items: [
            {
              key: "hardware",
              label: "Hardware",
              items: [
                { url: "/machines", label: "Machines" },
                { url: "/devices", label: "Devices" },
              ],
            },
          ],
        },
      ],
    };
    const { container } = render(<NavTree root={root} currentUrl="/devices" />);
    // The sub-item itself is highlighted (data-active sits on the row's
    // list item, aria-current on the link)…
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Devices" }).closest("li"),
    ).toHaveAttribute("data-active", "true");
    expect(
      screen.getByRole("link", { name: "Machines" }).closest("li"),
    ).not.toHaveAttribute("data-active");
    // …and its parent disclosure is open, so the highlight is visible.
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("re-opens the expandable parent when a nested sub-item becomes active on navigation", () => {
    // The parent is closed when loaded at a route outside its branch —
    // but routing to a nested sub-item must re-open it (the seed flipping
    // true re-opens the mounted instance).
    const root: NavRoot = {
      key: "root",
      items: [
        {
          key: "main",
          items: [
            { url: "/home", label: "Home" },
            {
              key: "hardware",
              label: "Hardware",
              items: [{ url: "/devices", label: "Devices" }],
            },
          ],
        },
      ],
    };
    const { container, rerender } = render(
      <NavTree root={root} currentUrl="/home" />,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details).not.toHaveAttribute("open");

    rerender(<NavTree root={root} currentUrl="/devices" />);
    expect(details).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Deliberately one-way: routing away does not close it.
    rerender(<NavTree root={root} currentUrl="/home" />);
    expect(details).toHaveAttribute("open");
  });
});
