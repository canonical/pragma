import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Announcement from "./Announcement.js";

describe("Announcement SSR", () => {
  it("renders without hydration errors", () => {
    const html = renderToString(
      <Announcement criticality="information">Test content</Announcement>,
    );
    expect(html).toContain("Test content");
    expect(html).toContain("ds announcement");
  });
});
