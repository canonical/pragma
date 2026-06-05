import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import usePreferredContrast from "./usePreferredContrast.js";

function Probe({
  initialValue,
}: {
  initialValue?: "no-preference" | "more" | "less";
}) {
  const { value, source } = usePreferredContrast({ initialValue });
  return (
    <span data-value={value} data-source={source}>
      {value}
    </span>
  );
}

describe("usePreferredContrast SSR", () => {
  it("renders with initialValue without errors", () => {
    const html = renderToString(<Probe initialValue="more" />);
    expect(html).toContain('data-value="more"');
    expect(html).toContain('data-source="system"');
  });

  it("renders no-preference as default", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-value="no-preference"');
    expect(html).toContain('data-source="system"');
  });
});
