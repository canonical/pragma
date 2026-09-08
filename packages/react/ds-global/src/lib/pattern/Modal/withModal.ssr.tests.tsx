import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { withModal } from "./index.js";
import Modal from "./Modal.js";

const Trigger = ({ children }: { children?: string }) => (
  <button type="button">{children}</button>
);

describe("withModal (SSR)", () => {
  it("renders to static HTML without throwing", () => {
    const TriggeredModal = withModal(
      Trigger,
      <>
        <Modal.Header>Title</Modal.Header>
        <Modal.Content>Body</Modal.Content>
      </>,
    );
    expect(() =>
      renderToString(<TriggeredModal>Open</TriggeredModal>),
    ).not.toThrow();
  });

  it("emits the trigger and a closed dialog", () => {
    const TriggeredModal = withModal(
      Trigger,
      <>
        <Modal.Header>Title</Modal.Header>
        <Modal.Content>Body</Modal.Content>
      </>,
    );
    const html = renderToString(<TriggeredModal>Open</TriggeredModal>);

    expect(html).toContain("ds modal-trigger");
    expect(html).toContain("Open");
    expect(html).toContain('class="ds modal"');
    // The dialog is only opened by a client-side effect, so it must render
    // closed on the server.
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });
});
