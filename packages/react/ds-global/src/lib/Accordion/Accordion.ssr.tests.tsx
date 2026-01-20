import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import Accordion from "./Accordion.js";

describe("Accordion SSR", () => {
  it("renders without errors on the server", () => {
    const html = renderToString(
      <Accordion>
        <Accordion.Item heading="Test Heading">Test Content</Accordion.Item>
      </Accordion>,
    );

    expect(html).toContain("ds accordion");
    expect(html).toContain("Test Heading");
  });

  it("renders multiple items", () => {
    const html = renderToString(
      <Accordion>
        <Accordion.Item heading="Section 1">Content 1</Accordion.Item>
        <Accordion.Item heading="Section 2">Content 2</Accordion.Item>
        <Accordion.Item heading="Section 3">Content 3</Accordion.Item>
      </Accordion>,
    );

    expect(html).toContain("Section 1");
    expect(html).toContain("Section 2");
    expect(html).toContain("Section 3");
  });

  it("renders expanded item content visible", () => {
    const html = renderToString(
      <Accordion>
        <Accordion.Item heading="Expanded" expanded>
          Visible Content
        </Accordion.Item>
      </Accordion>,
    );

    expect(html).toContain("Visible Content");
    expect(html).not.toContain('hidden=""');
  });

  it("renders collapsed item with hidden attribute", () => {
    const html = renderToString(
      <Accordion>
        <Accordion.Item heading="Collapsed">Hidden Content</Accordion.Item>
      </Accordion>,
    );

    expect(html).toContain("hidden");
  });
});
