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
  it("renders a server-provided initialValue as a stored preference", () => {
    const html = renderToString(<Probe initialValue="dark" />);
    expect(html).toContain('data-value="dark"');
    // A server-provided initialValue comes from the request cookie → "stored",
    // so the rendered control shows the chosen value rather than "System".
    expect(html).toContain('data-source="stored"');
  });

  it("renders light as default when no initialValue", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-value="light"');
    expect(html).toContain('data-source="system"');
  });
});
