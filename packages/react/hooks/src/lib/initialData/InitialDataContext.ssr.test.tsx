import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InitialDataProvider, useInitialData } from "./InitialDataContext.js";

function Probe() {
  const { theme } = useInitialData();
  return <span data-theme={theme ?? "none"} />;
}

describe("useInitialData SSR", () => {
  it("reads the provider value during server render", () => {
    const html = renderToString(
      <InitialDataProvider value={{ theme: "dark" }}>
        <Probe />
      </InitialDataProvider>,
    );
    expect(html).toContain('data-theme="dark"');
  });

  it("returns an empty object on the server with no provider (no window access)", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-theme="none"');
  });
});
