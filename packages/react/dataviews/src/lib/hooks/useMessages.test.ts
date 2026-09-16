/**
 * The words a root speaks: the application's messages over English, held at
 * one identity while they say the same, so an inline object costs nothing.
 */

import type { DataViewsMessages } from "@canonical/dataviews-core";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useMessages from "./useMessages.js";

/** The hook mounted over the messages a render hands it. */
const mount = (messages?: Partial<DataViewsMessages>) =>
  renderHook(
    ({ given }: { readonly given?: Partial<DataViewsMessages> }) =>
      useMessages(given),
    { initialProps: messages === undefined ? {} : { given: messages } },
  );

describe("useMessages", () => {
  it("speaks English where it is given nothing", () => {
    const { result } = mount();
    expect(result.current.search).toBe("Search");
    expect(result.current.rowsPerPage).toBe("Rows per page");
  });

  it("keeps English for every message the application leaves out", () => {
    const { result } = mount({ search: "Rechercher" });
    expect(result.current.search).toBe("Rechercher");
    expect(result.current.filters).toBe("Filters");
  });

  it("holds one identity while an inline object says the same", () => {
    const { result, rerender } = mount({ search: "Find" });
    const first = result.current;
    rerender({ given: { search: "Find" } });
    expect(result.current).toBe(first);
  });

  it("resolves again for a worded message written inline, which is why they are defined once", () => {
    const { result, rerender } = mount({
      selectRow: (name: string) => `Choisir ${name}`,
    });
    const first = result.current;
    // The same words, a new function: nothing can tell it says the same.
    rerender({ given: { selectRow: (name: string) => `Choisir ${name}` } });
    expect(result.current).not.toBe(first);
    expect(result.current.selectRow("alder")).toBe("Choisir alder");
  });

  it("resolves again once a message changes, is added or is taken away", () => {
    const { result, rerender } = mount({ search: "Find" });
    const first = result.current;
    rerender({ given: { search: "Look up" } });
    const reworded = result.current;
    expect(reworded).not.toBe(first);
    expect(reworded.search).toBe("Look up");
    rerender({ given: { search: "Look up", filters: "Narrow" } });
    const added = result.current;
    expect(added).not.toBe(reworded);
    expect(added.filters).toBe("Narrow");
    // The same count of members, one swapped for another.
    rerender({ given: { search: "Look up", page: "Sheet" } });
    expect(result.current).not.toBe(added);
    expect(result.current.filters).toBe("Filters");
    expect(result.current.page).toBe("Sheet");
    rerender({});
    expect(result.current.search).toBe("Search");
  });
});
