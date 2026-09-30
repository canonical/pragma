/**
 * EntityAside through the real page fan-out: the quick-facts list carries
 * URI, version (with the honest fallback — the captured value is null),
 * and tier; the region claims `data-region="aside"`, which is what makes
 * the frame's `--aside-w` token CONSUMED by a real tenant.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import componentEntityRecordsButton from "../__fixtures__/componentEntityRecordsButton.js";
import { BUTTON_URI, entityPageAt } from "../__fixtures__/entityPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("EntityAside", () => {
  it("renders the quick facts with data-region=aside", () => {
    const fetchFn = createFetchSpy();
    render(entityPageAt(BUTTON_URI, componentEntityRecordsButton, fetchFn));

    const aside = screen.getByRole("complementary", { name: "Quick facts" });
    expect(aside.getAttribute("data-region")).toBe("aside");
    expect(aside.textContent).toContain(BUTTON_URI);
    expect(aside.textContent).toContain("unversioned");
    expect(aside.textContent).toContain("Global");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
