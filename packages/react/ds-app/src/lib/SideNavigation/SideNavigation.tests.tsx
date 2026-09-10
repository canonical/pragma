import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SideNavigation from "./SideNavigation.js";
import type { FooterRoot, NavRoot } from "./types.js";

// root.items are groups; navigable links live in a group's own items. Here a
// single unlabelled group holds the links (no header rendered).
const root: NavRoot = {
  key: "root",
  items: [
    {
      key: "main",
      items: [
        { url: "/machines", label: "Machines" },
        { url: "/devices", label: "Devices" },
      ],
    },
  ],
};

const footerRoot: FooterRoot = {
  key: "footer",
  items: [{ label: "Settings", url: "/settings" }],
};

describe("SideNavigation", () => {
  it("renders as a self-contained nav landmark", () => {
    render(<SideNavigation root={root} />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("allows overriding the default aria-label", () => {
    render(<SideNavigation root={root} aria-label="Product navigation" />);
    expect(
      screen.getByRole("navigation", { name: "Product navigation" }),
    ).toBeInTheDocument();
  });

  it("renders the skip link first in DOM order", () => {
    const { container } = render(<SideNavigation root={root} />);
    const first = container.firstElementChild?.firstElementChild;
    expect(first).toHaveClass("skip-link");
    expect(first).toHaveTextContent("Skip to main content");
    expect(first).toHaveAttribute("href", "#main-content");
  });

  it("points the skip link at the skipTo target", () => {
    render(<SideNavigation root={root} skipTo="#my-main" />);
    expect(screen.getByText("Skip to main content")).toHaveAttribute(
      "href",
      "#my-main",
    );
  });

  it("renders the root items in the content region", () => {
    render(<SideNavigation root={root} />);
    expect(screen.getByText("Machines")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
  });

  it("applies the base and custom class to the root", () => {
    const { container } = render(
      <SideNavigation root={root} className="custom-class" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("ds side-navigation");
    expect(el?.className).toContain("custom-class");
  });

  it("renders the brand in the header", () => {
    render(<SideNavigation root={root} brand={<span>Acme</span>} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the footer items when footerRoot is provided", () => {
    render(<SideNavigation root={root} footerRoot={footerRoot} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks the currentUrl item as the current page", () => {
    render(<SideNavigation root={root} currentUrl="/devices" />);
    const active = screen.getByRole("link", { name: "Devices" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Machines" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("toggles expanded state (uncontrolled) and reflects it on the root", () => {
    const { container } = render(<SideNavigation root={root} />);
    const el = container.firstElementChild as HTMLElement;
    const toggle = screen.getByRole("button");
    expect(el.dataset.expanded).toBe("true");

    fireEvent.click(toggle);
    expect(el.dataset.expanded).toBe("false");

    // The attribute is the single source of truth for the rail state: no
    // collapsed class is authored on the root.
    expect(el.className).toBe("ds side-navigation");
  });

  it("wires the toggle's aria-controls to the content region", () => {
    render(<SideNavigation root={root} />);
    const toggle = screen.getByRole("button");
    const controlledId = toggle.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
    expect(document.getElementById(controlledId as string)).toContainElement(
      screen.getByText("Machines"),
    );
  });

  it("keeps the footer's expandable sub-items in the DOM when collapsed", () => {
    // Collapse is CSS-only: the popover degradation (styles.css) shows the
    // sub-items, but the tree must render regardless so Tab navigation and
    // the accessibility tree survive.
    const footerWithExpandable: FooterRoot = {
      key: "footer",
      items: [
        {
          label: "Account",
          items: [{ label: "Profile", url: "/profile" }],
        },
      ],
    };
    render(
      <SideNavigation
        root={root}
        defaultExpanded={false}
        footerRoot={footerWithExpandable}
      />,
    );
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(document.querySelector("details")).toBeInTheDocument();
  });

  it("marks the active footer row and opens its expandable parent", () => {
    const footerWithExpandable: FooterRoot = {
      key: "footer",
      items: [
        { label: "Settings", url: "/settings" },
        {
          label: "Account",
          items: [{ label: "Profile", url: "/profile" }],
        },
      ],
    };
    const { container } = render(
      <SideNavigation
        root={root}
        footerRoot={footerWithExpandable}
        currentUrl="/profile"
      />,
    );
    // The active leaf row is highlighted…
    expect(
      screen.getByRole("link", { name: "Profile" }).closest("li"),
    ).toHaveAttribute("data-active", "true");
    expect(
      screen.getByRole("link", { name: "Settings" }).closest("li"),
    ).not.toHaveAttribute("data-active");
    // …and its expandable parent is open (seeded from the active child).
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  // Controlled mode is not the official circuit yet — only uncontrolled is
  // supported. Kept here for when the controlled path is enabled.
  // it("calls onExpandedChange with the next state when controlled", () => {
  //   const onExpandedChange = vi.fn();
  //   render(
  //     <SideNavigation root={root} expanded onExpandedChange={onExpandedChange} />,
  //   );
  //   fireEvent.click(screen.getByRole("button"));
  //   expect(onExpandedChange).toHaveBeenCalledWith(false);
  // });

  it("collapses via the Ctrl+B shortcut by default, and keyboardShortcut: false opts out", () => {
    const { container } = render(<SideNavigation root={root} />);
    const el = container.firstElementChild as HTMLElement;
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(el.dataset.expanded).toBe("false");
    cleanup();

    const { container: optedOut } = render(
      <SideNavigation root={root} keyboardShortcut={false} />,
    );
    const elOptedOut = optedOut.firstElementChild as HTMLElement;
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(elOptedOut.dataset.expanded).toBe("true");
  });

  it("collapses after mount on a small viewport when defaultExpanded is left unset", async () => {
    // The expanded state renders as a fullscreen overlay below the small
    // breakpoint, so the unset default (true, desktop) must not ship as a
    // first-paint takeover on a phone. Post-mount, SSR-pure (SPEC.md §4).
    const matchMediaSpy = vi
      .spyOn(window, "matchMedia")
      .mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<SideNavigation root={root} />);
    await waitFor(() =>
      expect(
        (container.firstElementChild as HTMLElement).dataset.expanded,
      ).toBe("false"),
    );
    matchMediaSpy.mockRestore();
  });

  it("keeps an explicit defaultExpanded on every viewport", async () => {
    const matchMediaSpy = vi
      .spyOn(window, "matchMedia")
      .mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(
      <SideNavigation root={root} defaultExpanded />,
    );
    await waitFor(() =>
      expect(
        (container.firstElementChild as HTMLElement).dataset.expanded,
      ).toBe("true"),
    );
    matchMediaSpy.mockRestore();
  });

  it("stays expanded on a wide viewport when defaultExpanded is left unset", () => {
    const { container } = render(<SideNavigation root={root} />);
    expect((container.firstElementChild as HTMLElement).dataset.expanded).toBe(
      "true",
    );
  });

  it("responds to the collapse shortcut when keyboardShortcut is enabled", () => {
    const { container } = render(
      <SideNavigation root={root} keyboardShortcut />,
    );
    const el = container.firstElementChild as HTMLElement;
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(el.dataset.expanded).toBe("false");
  });

  it("orders focusable elements logo → collapse toggle → content → footer (SPEC.md §5)", () => {
    const { container } = render(
      <SideNavigation
        root={root}
        footerRoot={footerRoot}
        brand={<a href="/">Home</a>}
      />,
    );
    const focusable = Array.from(
      container.querySelectorAll("a, button"),
    ) as HTMLElement[];
    const labels = focusable.map(
      (el) => el.getAttribute("aria-label") || el.textContent,
    );
    expect(labels).toEqual([
      "Skip to main content", // skip navigation, first in DOM order
      "Home", // brand/logo
      "Collapse navigation", // collapse toggle
      "Machines", // content, top-to-bottom
      "Devices",
      "Settings", // footer, top-to-bottom
    ]);
  });

  it("renders the ContextSwitcher region between Header and Content, outside the nav landmark", () => {
    render(
      <SideNavigation
        root={root}
        contextSwitcher={{
          currentContext: { key: "default", name: "default" },
          contexts: [
            { key: "default", name: "default" },
            { key: "staging", name: "staging" },
          ],
        }}
      />,
    );
    const region = document.querySelector(
      ".ds.side-navigation-context-switcher-region",
    );
    expect(region).toBeInTheDocument();
    // Own region: skip link, header, region, nav — and outside the <nav>
    // landmark (a select-like widget is not navigation).
    const root_ = document.querySelector(".ds.side-navigation");
    expect(root_?.children).toHaveLength(4);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).not.toContainElement(region as HTMLElement);
  });

  it("hides the ContextSwitcher region when collapsed", () => {
    // CSS hides the region when collapsed via the ROOT's data-expanded (the
    // region carries no state of its own); this asserts the DOM contract
    // the collapsed stylesheet keys on — the region is a direct child of a
    // data-expanded="false" root, and the root alone flips.
    const { container } = render(
      <SideNavigation
        root={root}
        defaultExpanded={false}
        contextSwitcher={{
          currentContext: { key: "default", name: "default" },
          contexts: [{ key: "default", name: "default" }],
        }}
      />,
    );
    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl.dataset.expanded).toBe("false");
    const region = container.querySelector(
      ".ds.side-navigation-context-switcher-region",
    );
    expect(region).not.toHaveAttribute("data-expanded");
    expect(region?.parentElement).toBe(rootEl);
  });
});
