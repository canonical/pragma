import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import usePreferredTheme from "./usePreferredTheme.js";

function Probe({ initialValue }: { initialValue?: "light" | "dark" }) {
  const { value, source } = usePreferredTheme({ initialValue });
  return (
    <span data-value={value} data-source={source}>
      {value}
    </span>
  );
}

describe("usePreferredTheme SSR", () => {
  it("renders with initialValue without errors", () => {
    const html = renderToString(<Probe initialValue="dark" />);
    expect(html).toContain('data-value="dark"');
    expect(html).toContain('data-source="system"');
  });

  it("renders light as default when no initialValue", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-value="light"');
    expect(html).toContain('data-source="system"');
  });
});
