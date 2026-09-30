import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tooltip from "./Tooltip.js";

describe("Tooltip SSR", () => {
  it("renders the message bubble on the server without throwing", () => {
    const html = renderToString(<Tooltip isOpen>Tooltip message</Tooltip>);

    expect(html).toContain("ds tooltip");
    expect(html).toContain("Tooltip message");
  });

  it("carries the open/closed aria state into the server markup", () => {
    const open = renderToString(<Tooltip isOpen>Open message</Tooltip>);
    expect(open).toContain('aria-hidden="false"');

    const closed = renderToString(<Tooltip>Closed message</Tooltip>);
    expect(closed).toContain('aria-hidden="true"');
  });
});
