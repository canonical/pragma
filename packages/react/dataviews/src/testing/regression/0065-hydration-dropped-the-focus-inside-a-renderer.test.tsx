/**
 * Without scripting the renderer switch draws every renderer, so a reader may
 * be inside the second when scripts take over. Hydration kept the first and
 * removed the rest, taking the focused control with them and leaving focus on
 * the document. The renderer holding the focus becomes the chosen one.
 */

import { act, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { RendererChoice } from "../../lib/_work_in_progress/RendererSwitch/index.js";
import { RendererSwitch } from "../../lib/_work_in_progress/RendererSwitch/index.js";

const renderers: readonly RendererChoice[] = [
  {
    id: "table",
    label: "Table",
    content: <button type="button">in the table</button>,
  },
  {
    id: "cards",
    label: "Cards",
    content: <button type="button">in the cards</button>,
  },
];

const tree = <RendererSwitch label="Show machines as" renderers={renderers} />;

describe("hydrating a renderer switch a reader is inside", () => {
  it("keeps the renderer holding the focus, and the focus with it", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    // What a reader without scripting can do: the second renderer is drawn,
    // and its control takes the focus before hydration.
    const inTheCards = screen.getByText("in the cards");
    inTheCards.focus();
    expect(document.activeElement).toBe(inTheCards);

    await act(async () => {
      const root = hydrateRoot(container, tree);
      onTestFinished(() => {
        act(() => {
          root.unmount();
        });
      });
    });
    expect(errors).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLSelectElement>("combobox", {
        name: "Show machines as",
      }).value,
    ).toBe("cards");
    expect(screen.getByText("in the cards")).toBe(document.activeElement);
    expect(screen.queryByText("in the table")).toBeNull();
  });
});
