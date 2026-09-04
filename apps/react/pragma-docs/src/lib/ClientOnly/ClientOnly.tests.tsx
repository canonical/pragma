import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ClientOnly from "./ClientOnly.js";

describe("ClientOnly component", () => {
  it("renders children after mounting in the browser", () => {
    render(
      <ClientOnly fallback={<p>Loading…</p>}>
        <p>Client content</p>
      </ClientOnly>,
    );
    expect(screen.getByText("Client content")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("renders the fallback when server-rendered", () => {
    const html = renderToString(
      <ClientOnly fallback={<p>Loading…</p>}>
        <p>Client content</p>
      </ClientOnly>,
    );
    expect(html).toContain("Loading…");
    expect(html).not.toContain("Client content");
  });

  it("renders nothing on the server without a fallback", () => {
    const html = renderToString(
      <ClientOnly>
        <p>Client content</p>
      </ClientOnly>,
    );
    expect(html).toBe("");
  });
});
