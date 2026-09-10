import type { MouseEventHandler } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { withModal } from "./index.js";
import Component from "./Provider.js";

const Trigger = ({
  children,
  onClick,
}: {
  children?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) => (
  <button type="button" onClick={onClick}>
    {children}
  </button>
);

describe("withModal (SSR)", () => {
  it("renders to static HTML without throwing", () => {
    const TriggeredModal = withModal(Trigger, ({ ref }) => (
      <Component ref={ref}>
        <Component.Header>Title</Component.Header>
        <Component.Content>Body</Component.Content>
      </Component>
    ));
    expect(() =>
      renderToString(<TriggeredModal>Open</TriggeredModal>),
    ).not.toThrow();
  });

  it("emits the trigger and a closed dialog", () => {
    const TriggeredModal = withModal(Trigger, ({ ref }) => (
      <Component ref={ref}>
        <Component.Header>Title</Component.Header>
        <Component.Content>Body</Component.Content>
      </Component>
    ));
    const html = renderToString(<TriggeredModal>Open</TriggeredModal>);

    expect(html).toContain("Open");
    expect(html).toContain('class="ds modal"');
    // The dialog is only opened by a client-side effect, so it must render
    // closed on the server.
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });
});
