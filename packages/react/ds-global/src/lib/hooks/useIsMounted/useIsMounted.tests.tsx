import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useIsMounted } from "./index.js";

describe("useIsMounted", () => {
  it("is true after the component mounts on the client", () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current).toBe(true);
  });

  it("is false during server rendering (no mount effect runs)", () => {
    // renderToString never flushes effects, so the hook stays at its initial
    // value — the contract callers rely on to defer portals until hydration.
    const Probe = () => <>{String(useIsMounted())}</>;
    expect(renderToString(<Probe />)).toBe("false");
  });
});
