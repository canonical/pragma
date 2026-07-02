import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Announcement from "./Announcement.js";

describe("Announcement SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(<Announcement>Test content</Announcement>);
    expect(html).toContain("Test content");
    expect(html).toContain("ds announcement");
  });

  it("renders with role alert", () => {
    const html = renderToString(<Announcement>Content</Announcement>);
    expect(html).toContain('role="alert"');
  });
});
