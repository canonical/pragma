import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import usePreferredMotion from "./usePreferredMotion.js";

function Probe({
  initialValue,
}: {
  initialValue?: "no-preference" | "reduce";
}) {
  const { value, source } = usePreferredMotion({ initialValue });
  return (
    <span data-value={value} data-source={source}>
      {value}
    </span>
  );
}

describe("usePreferredMotion SSR", () => {
  it("renders a server-provided initialValue as a stored preference", () => {
    const html = renderToString(<Probe initialValue="reduce" />);
    expect(html).toContain('data-value="reduce"');
    expect(html).toContain('data-source="stored"');
  });

  it("renders no-preference as default", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-value="no-preference"');
    expect(html).toContain('data-source="system"');
  });
});
