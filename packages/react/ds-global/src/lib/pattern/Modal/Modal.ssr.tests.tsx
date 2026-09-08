import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Modal.js";

describe("Modal SSR", () => {
  it("doesn't throw", () => {
    expect(() =>
      renderToString(
        <Component>
          <Component.Content>Placeholder content</Component.Content>
        </Component>,
      ),
    ).not.toThrow();
  });

  it("renders the dialog and its composed parts", () => {
    const html = renderToString(
      <Component>
        <Component.Header>Title</Component.Header>
        <Component.Content>Placeholder content</Component.Content>
        <Component.Footer>
          <button type="button">Confirm</button>
        </Component.Footer>
      </Component>,
    );
    expect(html).toContain('class="ds modal"');
    expect(html).toContain('class="ds modal-header"');
    expect(html).toContain('class="ds modal-content"');
    expect(html).toContain('class="ds modal-footer"');
  });

  it("renders closed", () => {
    // showModal() is what makes a dialog modal, and it only runs on the
    // client: a server-rendered `open` attribute would paint a non-modal
    // dialog with no backdrop and no focus trap.
    const html = renderToString(
      <Component>
        <Component.Content>Placeholder content</Component.Content>
      </Component>,
    );
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });
});
