import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished } from "vitest";
import useHydrationFocusHandoff from "./useHydrationFocusHandoff.js";

/** A link until hydrated, and the button replacing it after. */
const Swapped = ({
  hydrated,
}: {
  readonly hydrated: boolean;
}): ReactElement => {
  const { link, button } = useHydrationFocusHandoff({ hydrated });
  return hydrated ? (
    <button ref={button} type="button">
      Move
    </button>
  ) : (
    <a ref={link} href="?moved">
      Move
    </a>
  );
};

/**
 * Draw the server's link into the document, run `beforeHydrating` against it,
 * hydrate it as a link, then render the hydrated button in its place.
 */
const hydrateThenSwap = async (
  beforeHydrating: (link: HTMLAnchorElement) => void,
): Promise<void> => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<Swapped hydrated={false} />);
  document.body.append(container);
  onTestFinished(() => {
    container.remove();
  });
  const link = container.querySelector("a");
  if (link === null) {
    throw new Error("the server rendered no link");
  }
  beforeHydrating(link);
  const root: Root = await act(async () =>
    hydrateRoot(container, <Swapped hydrated={false} />),
  );
  onTestFinished(() => {
    act(() => {
      root.unmount();
    });
  });
  act(() => {
    root.render(<Swapped hydrated />);
  });
};

describe("useHydrationFocusHandoff", () => {
  it("hands the link's focus to the button that replaces it", async () => {
    await hydrateThenSwap((link) => {
      link.focus();
    });
    expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
  });

  it("moves no focus when a client renders the button with no server's link", () => {
    const before = document.activeElement;
    render(<Swapped hydrated />);
    expect(document.activeElement).toBe(before);
  });

  it("leaves focus where it was when the link did not hold it", async () => {
    const before = document.activeElement;
    await hydrateThenSwap(() => {});
    expect(document.activeElement).toBe(before);
    expect(screen.getByRole("button", { name: "Move" })).not.toHaveFocus();
  });
});
