import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import silenceRenderErrors from "../../../../testing/silenceRenderErrors.js";
import RendererSwitch from "./RendererSwitch.js";
import type { RendererChoice } from "./types.js";

const renderers: readonly RendererChoice[] = [
  { id: "table", label: "Table", content: <p>the table</p> },
  { id: "cards", label: "Cards", content: <p>the cards</p> },
];

/** The switch's select, by the label it is given. */
const readChoice = (): HTMLSelectElement =>
  screen.getByRole("combobox", { name: "Show machines as" });

describe("RendererSwitch", () => {
  it("offers each renderer in a select named by its label, the first chosen", () => {
    render(<RendererSwitch label="Show machines as" renderers={renderers} />);
    const choice = readChoice();
    expect(
      [...choice.options].map((option) => [option.value, option.text]),
    ).toEqual([
      ["table", "Table"],
      ["cards", "Cards"],
    ]);
    expect(choice.value).toBe("table");
  });

  it("draws only the chosen renderer, in a region named for it", () => {
    render(<RendererSwitch label="Show machines as" renderers={renderers} />);
    expect(screen.getByRole("region", { name: "Table" })).toHaveTextContent(
      "the table",
    );
    expect(screen.queryByRole("region", { name: "Cards" })).toBeNull();
    expect(screen.queryByText("the cards")).toBeNull();
  });

  it("draws the renderer chosen instead, keeping focus on the choice", () => {
    render(<RendererSwitch label="Show machines as" renderers={renderers} />);
    const choice = readChoice();
    choice.focus();
    fireEvent.change(choice, { target: { value: "cards" } });
    expect(choice.value).toBe("cards");
    expect(choice).toHaveFocus();
    expect(screen.getByRole("region", { name: "Cards" })).toHaveTextContent(
      "the cards",
    );
    expect(screen.queryByText("the table")).toBeNull();
  });

  it("returns to the first renderer when the chosen one is no longer offered", () => {
    const { rerender } = render(
      <RendererSwitch label="Show machines as" renderers={renderers} />,
    );
    fireEvent.change(readChoice(), { target: { value: "cards" } });
    rerender(
      <RendererSwitch
        label="Show machines as"
        renderers={renderers.filter((renderer) => renderer.id !== "cards")}
      />,
    );
    expect(readChoice().value).toBe("table");
    expect(screen.getByText("the table")).toBeInTheDocument();
  });

  it("names its root by its label, spreading and merging the caller's props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <RendererSwitch
        label="Show machines as"
        renderers={renderers}
        className="mine"
        data-testid="switch"
        ref={ref}
      />,
    );
    const root = screen.getByTestId("switch");
    expect(root.tagName).toBe("SECTION");
    expect(root).toHaveAccessibleName("Show machines as");
    expect(root).toHaveClass("ds", "renderer-switch", "mine");
    expect(ref.current).toBe(root);
  });

  it("names itself and its choice from the words where nothing names it", () => {
    render(<RendererSwitch renderers={renderers} />);
    expect(
      screen.getByRole("combobox", { name: "Show as" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Show as" })).toBeInTheDocument();
  });

  it("speaks the application's own word for its name", () => {
    render(
      <RendererSwitch
        renderers={renderers}
        messages={{ renderer: "Afficher comme" }}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Afficher comme" }),
    ).toBeInTheDocument();
  });

  it("throws without a renderer to show", () => {
    silenceRenderErrors();
    expect(() =>
      render(<RendererSwitch label="Show machines as" renderers={[]} />),
    ).toThrow("RendererSwitch requires at least one renderer");
  });

  it("throws when two renderers share an id", () => {
    silenceRenderErrors();
    expect(() =>
      render(
        <RendererSwitch
          label="Show machines as"
          renderers={[
            { id: "table", label: "Table", content: null },
            { id: "table", label: "Another table", content: null },
          ]}
        />,
      ),
    ).toThrow("RendererSwitch requires a distinct id for each renderer");
  });
});

describe("RendererSwitch hydrating what the server drew", () => {
  const tree = (
    <RendererSwitch label="Show machines as" renderers={renderers} />
  );

  it("hydrates without a mismatch, then offers the choice over the first renderer alone", async () => {
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
    const recovered = vi.fn();
    await act(async () => {
      const root = hydrateRoot(container, tree, {
        onRecoverableError: recovered,
      });
      onTestFinished(() => {
        act(() => {
          root.unmount();
        });
      });
    });
    expect(recovered).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLSelectElement>("combobox", {
        name: "Show machines as",
      }).value,
    ).toBe("table");
    expect(screen.getByText("the table")).toBeInTheDocument();
    expect(screen.queryByText("the cards")).toBeNull();
  });
});

describe("RendererSwitch hydrating with the focus elsewhere", () => {
  /** The switch's markup as a server draws it, in the page. */
  const drawServerMarkup = (): HTMLElement => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <RendererSwitch label="Show machines as" renderers={renderers} />,
    );
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    return container;
  };

  /** Hydrate that markup, as a browser does once its scripts arrive. */
  const hydrate = async (container: HTMLElement): Promise<void> => {
    await act(async () => {
      const root = hydrateRoot(
        container,
        <RendererSwitch label="Show machines as" renderers={renderers} />,
      );
      onTestFinished(() => {
        act(() => {
          root.unmount();
        });
      });
    });
  };

  it("keeps the first renderer when nothing holds the focus", async () => {
    const errors = vi.spyOn(console, "error");
    onTestFinished(() => {
      errors.mockRestore();
    });
    const container = drawServerMarkup();
    expect(document.activeElement).toBe(document.body);
    await hydrate(container);
    expect(errors).not.toHaveBeenCalled();
    expect(readChoice().value).toBe("table");
    expect(screen.getByText("the table")).toBeInTheDocument();
    expect(screen.queryByText("the cards")).toBeNull();
  });

  it("keeps the first renderer, and the focus, when the focus is outside the switch", async () => {
    const outside = document.createElement("button");
    outside.textContent = "elsewhere";
    document.body.append(outside);
    onTestFinished(() => {
      outside.remove();
    });
    const container = drawServerMarkup();
    outside.focus();
    await hydrate(container);
    expect(readChoice().value).toBe("table");
    expect(document.activeElement).toBe(outside);
  });
});
