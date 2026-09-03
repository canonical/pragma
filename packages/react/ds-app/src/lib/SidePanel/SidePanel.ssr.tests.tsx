import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SidePanel from "./SidePanel.js";

describe("SidePanel SSR", () => {
  it("renders its parts without hydration errors", () => {
    const html = renderToString(
      <SidePanel open={false} onOpenChange={() => {}}>
        <SidePanel.Header>Panel title</SidePanel.Header>
        <SidePanel.Content>Test content</SidePanel.Content>
        <SidePanel.Footer>Actions</SidePanel.Footer>
      </SidePanel>,
    );
    expect(html).toContain("ds side-panel");
    expect(html).toContain("ds side-panel-header");
    expect(html).toContain("ds side-panel-content");
    expect(html).toContain("ds side-panel-footer");
    expect(html).toContain("Panel title");
    expect(html).toContain("Test content");
    expect(html).toContain("Actions");
  });

  it("never paints an open dialog on the server", () => {
    const html = renderToString(
      <SidePanel open={true} onOpenChange={() => {}}>
        <SidePanel.Content>Test content</SidePanel.Content>
      </SidePanel>,
    );
    /*
      Opening runs through `show()` in an effect, which the server never
      executes, so the markup is always closed and the panel appears after
      hydration. Documented behaviour rather than a defect: a server-painted
      panel would need the `open` attribute, and a dialog opened by attribute is
      not the same thing as one opened by `show()`.

      Asserted against the opening tag rather than the whole document, and on a
      tag that must exist: `not.toContain("<dialog open")` would pass just as
      happily if `open` were emitted after another attribute.
    */
    const dialogTag = html.match(/<dialog[^>]*>/)?.[0];
    expect(dialogTag).toBeDefined();
    expect(dialogTag).not.toMatch(/\sopen[=\s>]/);
  });

  it("does not claim to be modal", () => {
    const html = renderToString(
      <SidePanel open={true} onOpenChange={() => {}} aria-label="Filters">
        <SidePanel.Content>Test content</SidePanel.Content>
      </SidePanel>,
    );
    expect(html).not.toContain("aria-modal");
  });
});
