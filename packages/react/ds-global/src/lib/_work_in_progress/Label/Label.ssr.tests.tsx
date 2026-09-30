import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Label from "./Label.js";

describe("Label SSR", () => {
  it("renders without errors on server", () => {
    const html = renderToString(<Label>Server Label</Label>);
    expect(html).toContain("Server Label");
    expect(html).toContain('class="ds label"');
  });

  it("renders with criticality modifier on server", () => {
    const html = renderToString(<Label criticality="error">Error</Label>);
    expect(html).toContain("error");
  });
});
