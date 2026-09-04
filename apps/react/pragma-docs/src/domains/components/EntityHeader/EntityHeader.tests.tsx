/**
 * EntityHeader through the real page fan-out (see `entityPageHarness`):
 * the identity block renders name, URI, tier, and summary from the
 * captured fixture, never the network.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("EntityHeader", () => {
  it("renders the identity block: h1 name, uri code line, tier, summary", () => {
    const fetchFn = createFetchSpy();
    const { container } = render(
      entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn),
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Button" });
    expect(heading.id).toBe("component-entity-title");
    const header = container.querySelector(".ds.entity-header");
    expect(header).not.toBeNull();
    expect(header?.querySelector("code")?.textContent).toBe(BUTTON_URI);
    expect(header?.textContent).toContain("tier: Global");
    expect(header?.textContent).toContain(
      "Buttons trigger actions within an interface",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
