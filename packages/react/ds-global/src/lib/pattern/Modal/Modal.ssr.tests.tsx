import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Component from "./Modal.js";

describe("Modal SSR", () => {
  it("doesn't throw", () => {
    expect(() =>
      renderToString(
        <Component open>
          <Component.Content>Placeholder content</Component.Content>
        </Component>,
      ),
    ).not.toThrow();
  });

  it("renders the dialog and its composed parts", () => {
    const html = renderToString(
      <Component open>
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
});
