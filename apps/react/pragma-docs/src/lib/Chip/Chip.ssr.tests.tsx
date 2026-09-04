/**
 * Server-render and hydration coverage.
 *
 * The first suite only asserts the shape of `renderToString` output. The
 * second hydrates that exact output with `hydrateRoot` — React 19 reports
 * hydration mismatches through `onRecoverableError` (not `console.error`),
 * so each test asserts that callback never fires, and a deliberate-mismatch
 * control proves the assertion has teeth.
 */
import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Chip from "./Chip.js";
import ChipLegend from "./Legend.js";

describe("Chip server-render output", () => {
  it("server-renders the text form as a span", () => {
    const html = renderToString(
      <Chip kind="component" label="Button" uri="ds:global.component.button" />,
    );
    expect(html).toContain("Button");
    expect(html).toContain("<span");
    expect(html).not.toContain("<a");
  });

  it("server-renders the linked form as an anchor", () => {
    const html = renderToString(
      <Chip
        href="/components/button"
        kind="component"
        label="Button"
        uri="ds:global.component.button"
      />,
    );
    expect(html).toContain('href="/components/button"');
    expect(html).toContain("<a");
  });

  it("server-renders the legend without browser APIs", () => {
    const html = renderToString(<ChipLegend />);
    expect(html).toContain("chip-legend");
  });
});

// Driving `act` directly (no Testing Library wrapper) needs the flag.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Chip hydration", () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await act(async () => {
        root.unmount();
      });
    }
    for (const container of containers.splice(0)) {
      container.remove();
    }
  });

  /** Hydrates `jsx` against `serverHtml`; returns the recoverable-error spy. */
  async function hydrateAgainst(
    serverHtml: string,
    jsx: ReactElement,
  ): Promise<ReturnType<typeof vi.fn>> {
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    containers.push(container);
    const onRecoverableError = vi.fn();
    await act(async () => {
      roots.push(hydrateRoot(container, jsx, { onRecoverableError }));
    });
    return onRecoverableError;
  }

  it("hydrates the span form over its own server HTML without recoverable errors", async () => {
    const jsx = (
      <Chip
        kind="term"
        label="density"
        lifecycle="beta"
        summary="How tightly a layout packs its controls."
        uri="docs:glossary.density"
      />
    );
    const onRecoverableError = await hydrateAgainst(renderToString(jsx), jsx);
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it("hydrates the anchor form over its own server HTML without recoverable errors", async () => {
    const jsx = (
      <Chip
        href="/components/ds%3Aglobal.component.button"
        kind="component"
        label="Button"
        lifecycle="canonical"
        summary="The primary action component."
        uri="ds:global.component.button"
      />
    );
    const onRecoverableError = await hydrateAgainst(renderToString(jsx), jsx);
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it("control: reports a recoverable error against deliberately different HTML", async () => {
    // The negative control: hydrating over HTML the server never produced
    // MUST trip the spy — proving the green assertions above can fail.
    // React also prints the mismatch diff via console.error; silence it so
    // the deliberate failure does not pollute the run's output.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const onRecoverableError = await hydrateAgainst(
        renderToString(
          <Chip kind="term" label="server label" uri="docs:glossary.density" />,
        ),
        <Chip kind="term" label="client label" uri="docs:glossary.density" />,
      );
      expect(onRecoverableError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
