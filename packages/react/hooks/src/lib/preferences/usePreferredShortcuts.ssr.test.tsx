import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import usePreferredShortcuts from "./usePreferredShortcuts.js";

function Probe({ initialValue }: { initialValue?: "on" | "off" }) {
  const { value, source } = usePreferredShortcuts({ initialValue });
  return (
    <span data-value={value} data-source={source}>
      {value}
    </span>
  );
}

describe("usePreferredShortcuts SSR", () => {
  it("renders with initialValue without errors", () => {
    const html = renderToString(<Probe initialValue="off" />);
    expect(html).toContain('data-value="off"');
    expect(html).toContain('data-source="system"');
  });

  it("renders on as default", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-value="on"');
    expect(html).toContain('data-source="system"');
  });
});
