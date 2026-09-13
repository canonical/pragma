import { listDisplayEntries } from "@canonical/dataviews-core/bindings";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import useVirtualRows from "./useVirtualRows.js";

/** A host that reads the hook but never attaches the body it hands back. */
function Detached(): ReactElement {
  useVirtualRows({
    entries: listDisplayEntries({ rowIds: ["a"], status: null }),
    estimatedRowHeight: 32,
    model: { entries: [], ids: [], byId: () => undefined },
    tracks: undefined,
  });
  return <div />;
}

describe("useVirtualRows", () => {
  it("reports a body that was never mounted rather than reading through it", () => {
    const failure = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Detached />)).toThrow(
      "the virtualized body is not mounted",
    );
    failure.mockRestore();
  });
});
