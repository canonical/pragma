import { getQueriesForElement, prettyDOM } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { render as renderSvelte } from "svelte/server";
import type { RenderFunction } from "./types.js";

export const render: RenderFunction = (...args: Parameters<RenderFunction>) => {
  const { head, body } = renderSvelte(...args);
  const { window } = new JSDOM(
    `<!doctype html><html><body>${body}</body></html>`,
  );
  const { document } = window;
  const { body: container } = document;
  const queries = getQueriesForElement(container);

  return {
    ...queries,
    window,
    document,
    container,
    head,
    body,
    pretty: (maxLength = 10000) => prettyDOM(container, maxLength) || "",
  };
};
