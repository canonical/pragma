import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconExplorer } from "./IconExplorer.js";
import type { IconExplorerMetadata } from "./types.js";

const icons = [
  "delete",
  "close",
  "starred-off",
  "search",
  "bookmarked",
  "old-thing",
];

const metadata: Record<string, IconExplorerMetadata> = {
  delete: {
    tags: ["trash", "bin", "remove"],
    categories: ["action"],
    description: "Throw something away.",
  },
  close: { tags: ["cancel", "exit", "cross"], categories: ["action"] },
  "starred-off": {
    tags: ["star", "off", "bookmark"],
    categories: ["action"],
    aliases: ["unstarred"],
  },
  search: { tags: ["find", "explore", "magnify"], categories: ["navigation"] },
  bookmarked: { tags: ["bookmark", "saved", "star"], categories: ["action"] },
  "old-thing": {
    tags: ["obsolete", "legacy", "gone"],
    categories: ["object"],
    deprecated: { replacedBy: "delete", since: "0.38.0" },
  },
};

type ExplorerProps = Parameters<typeof IconExplorer<string>>[0];

const renderExplorer = (
  props: Partial<ExplorerProps> & Record<string, unknown> = {},
) =>
  render(
    <IconExplorer
      metadata={metadata}
      renderIcon={(name) => <svg data-testid={`glyph-${name}`} role="none" />}
      snippet={(name) => `<Icon icon="${name}" />`}
      importLine={'import { Icon } from "@canonical/react-ds-global";'}
      {...props}
    />,
  );

// Scoped to the grid: the category <select> contributes its own options.
const layOutInRows = (columns: number) => {
  options().forEach((cell, index) => {
    Object.defineProperty(cell, "offsetTop", {
      value: Math.floor(index / columns) * 40,
      configurable: true,
    });
  });
};

const options = () =>
  within(screen.getByRole("listbox")).getAllByRole("option");

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, text: async () => "<svg />" }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IconExplorer", () => {
  it("shows every icon that is not deprecated to begin with", () => {
    renderExplorer();

    // `old-thing` is deprecated, so it is out until asked for.
    expect(options()).toHaveLength(5);
    expect(screen.getByText("5 of 6 icons")).toBeInTheDocument();
  });

  it("announces the result count in a live region", async () => {
    const { container } = renderExplorer();

    // The visible count is a description; the announcement is a separate,
    // settled live region so typing does not flood the queue.
    expect(screen.getByText("5 of 6 icons")).not.toHaveAttribute("aria-live");

    const status = container.querySelector(".visually-hidden") as HTMLElement;
    expect(status).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(status).toHaveTextContent("5 of 6 icons"));
  });

  it("finds an icon by a synonym and says which synonym matched", () => {
    renderExplorer({ initialQuery: "trash" });

    expect(options()).toHaveLength(1);
    expect(screen.getByText("delete")).toBeInTheDocument();
    expect(screen.getByText("via synonym: trash")).toBeInTheDocument();
  });

  it("finds an icon by the name it used to have", () => {
    renderExplorer({ initialQuery: "unstarred" });

    expect(screen.getByText("starred-off")).toBeInTheDocument();
    expect(screen.getByText("was “unstarred”")).toBeInTheDocument();
  });

  it("filters by category", () => {
    renderExplorer();

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "navigation" },
    });

    expect(options()).toHaveLength(1);
    expect(screen.getByText("search")).toBeInTheDocument();
  });

  it("hides deprecated icons until asked", () => {
    renderExplorer();

    expect(screen.queryByText("old-thing")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/show deprecated/i));

    expect(screen.getByText("old-thing")).toBeInTheDocument();
  });

  it("opens a detail panel beside the grid rather than a dialog", () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));

    const detail = screen.getByRole("complementary", {
      name: "Details for delete",
    });
    expect(
      within(detail).getByText("Throw something away."),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText('<Icon icon="delete" />'),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says what a deprecated icon was replaced by", () => {
    renderExplorer();

    fireEvent.click(screen.getByLabelText(/show deprecated/i));
    fireEvent.click(screen.getByText("old-thing"));

    const detail = screen.getByRole("complementary", {
      name: "Details for old-thing",
    });
    expect(detail).toHaveTextContent("Deprecated since 0.38.0");
    expect(
      within(detail).getByRole("button", { name: "delete" }),
    ).toBeInTheDocument();
  });

  it("copies the snippet", async () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));
    fireEvent.click(screen.getByRole("button", { name: "Copy snippet" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '<Icon icon="delete" />',
    );
  });

  it("offers the raw file for download", () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));

    expect(screen.getByRole("link", { name: "Download SVG" })).toHaveAttribute(
      "href",
      "/icons/delete.svg",
    );
  });

  it("re-runs the search from a tag chip", () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));
    const detail = screen.getByRole("complementary", {
      name: "Details for delete",
    });
    fireEvent.click(within(detail).getByRole("button", { name: "bin" }));

    expect(screen.getByLabelText("Search icons")).toHaveValue("bin");
    expect(options()).toHaveLength(1);
  });

  it("moves through the grid with arrow keys and selects with Enter", () => {
    renderExplorer();

    const grid = screen.getByRole("listbox");
    expect(options()[0]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(options()[1]).toHaveAttribute("tabindex", "0");
    expect(options()[0]).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(grid, { key: "End" });
    expect(options()[options().length - 1]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(grid, { key: "Home" });
    fireEvent.keyDown(grid, { key: "Enter" });

    expect(
      screen.getByRole("complementary", { name: "Details for delete" }),
    ).toBeInTheDocument();
  });

  it("moves a row at a time with ArrowDown and ArrowUp", () => {
    renderExplorer();
    layOutInRows(2);
    // Re-measure: the row length is read back from the rendered layout.
    fireEvent.change(screen.getByLabelText(/size/i), {
      target: { value: "28" },
    });
    const grid = screen.getByRole("listbox");

    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(options()[2]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(options()[0]).toHaveAttribute("tabindex", "0");

    // Clamps rather than wrapping.
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(options()[0]).toHaveAttribute("tabindex", "0");
  });

  it("moves left as well as right", () => {
    renderExplorer();
    const grid = screen.getByRole("listbox");

    fireEvent.keyDown(grid, { key: "ArrowRight" });
    fireEvent.keyDown(grid, { key: "ArrowLeft" });

    expect(options()[0]).toHaveAttribute("tabindex", "0");
  });

  it("selects with Space as well as Enter", () => {
    renderExplorer();

    fireEvent.keyDown(screen.getByRole("listbox"), { key: " " });

    expect(
      screen.getByRole("complementary", { name: "Details for delete" }),
    ).toBeInTheDocument();
  });

  it("copies the raw file once it has loaded", async () => {
    renderExplorer();
    fireEvent.click(screen.getByRole("option", { name: "delete" }));

    expect(fetch).toHaveBeenCalledWith("/icons/delete.svg");
    const button = () => screen.getByRole("button", { name: /Copy SVG/ });
    expect(button()).toBeDisabled();

    await waitFor(() => expect(button()).toBeEnabled());
    fireEvent.click(button());

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("<svg />"),
    );
  });

  it("leaves Copy SVG disabled when the file cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, text: async () => "Not found" }),
    );
    renderExplorer();

    fireEvent.click(screen.getByRole("option", { name: "delete" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Copy SVG/ })).toBeDisabled(),
    );
  });

  it("shows only the icons it is given, in the order given", () => {
    // Deliberately not alphabetical, and a subset of the metadata keys.
    const chosen = [icons[3], icons[1]];
    renderExplorer({ icons: chosen });

    expect(options().map((option) => option.textContent)).toEqual(chosen);
    expect(
      screen.getByText("2 of 2 icons", { selector: ".count" }),
    ).toBeInTheDocument();
  });

  it("leaves / alone while someone is typing in a field", () => {
    renderExplorer();
    const event = new KeyboardEvent("keydown", {
      key: "/",
      bubbles: true,
      cancelable: true,
    });

    screen.getByLabelText("Search icons").dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("closes the detail panel on Escape", () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("focuses the search box when / is pressed", () => {
    renderExplorer();

    fireEvent.keyDown(document, { key: "/" });

    expect(screen.getByLabelText("Search icons")).toHaveFocus();
  });

  it("lists the nearest names when nothing matches", () => {
    renderExplorer({ initialQuery: "zzzzqqq" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
    expect(screen.getByText("Closest names:")).toBeInTheDocument();
  });

  it("derives the grid cell width from the chosen icon size", () => {
    const { container } = renderExplorer();
    const root = container.querySelector(".icon-explorer") as HTMLElement;

    expect(root.style.getPropertyValue("--icon-explorer-size")).toBe("24px");

    fireEvent.change(screen.getByLabelText(/size/i), {
      target: { value: "40" },
    });

    expect(root.style.getPropertyValue("--icon-explorer-size")).toBe("40px");
  });

  it("follows the page colour scheme instead of forcing its own", () => {
    const { container } = renderExplorer();
    const body = container.querySelector(".preview-area") as HTMLElement;

    expect(screen.queryByLabelText(/dark preview/i)).toBeNull();
    expect(body.style.colorScheme).toBe("");
    expect(body).not.toHaveClass("light");
    expect(body).not.toHaveClass("dark");
  });

  it("suggests related icons by shared tags", () => {
    renderExplorer();

    // `close` and `old-thing` share no tag with `delete`; `starred-off` does not
    // either, so `delete` has no related icons.
    fireEvent.click(screen.getByText("delete"));
    expect(screen.queryByText("Related")).not.toBeInTheDocument();

    // `bookmark` is shared between starred-off and bookmarked.
    fireEvent.click(screen.getByText("starred-off"));
    const detail = screen.getByRole("complementary", {
      name: "Details for starred-off",
    });
    expect(within(detail).getByText("Related")).toBeInTheDocument();
    expect(
      within(detail).getByRole("button", { name: /bookmarked/ }),
    ).toBeInTheDocument();
  });

  it("clears the detail panel when a filter excludes the selected icon", () => {
    renderExplorer();

    fireEvent.click(screen.getByText("delete"));
    expect(screen.getByRole("complementary")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "navigation" },
    });

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("names the region after its heading when one is given", () => {
    renderExplorer({ title: "Icon set" });

    expect(
      screen.getByRole("region", { name: "Icon set" }),
    ).toBeInTheDocument();
  });

  it("lets a consumer override the accessible name", () => {
    renderExplorer({ "aria-label": "Pick an icon" });

    expect(
      screen.getByRole("region", { name: "Pick an icon" }),
    ).toBeInTheDocument();
  });

  it("serves raw files from rootPath", () => {
    renderExplorer({ rootPath: "/assets/icons" });

    fireEvent.click(screen.getByText("delete"));

    expect(screen.getByRole("link", { name: "Download SVG" })).toHaveAttribute(
      "href",
      "/assets/icons/delete.svg",
    );
  });

  it("passes native section attributes through to the root", () => {
    const { container } = renderExplorer({
      id: "icons",
      "data-testid": "explorer",
      style: { marginTop: "1rem" },
    });
    const root = container.querySelector(".icon-explorer") as HTMLElement;

    expect(root).toHaveAttribute("id", "icons");
    expect(root).toHaveAttribute("data-testid", "explorer");
    // A consumer style survives alongside the size custom property.
    expect(root.style.marginTop).toBe("1rem");
    expect(root.style.getPropertyValue("--icon-explorer-size")).toBe("24px");
  });

  it("applies a custom class name", () => {
    const { container } = renderExplorer({ className: "custom" });

    expect(container.querySelector(".icon-explorer")).toHaveClass(
      "icon-explorer",
      "custom",
    );
  });
});
