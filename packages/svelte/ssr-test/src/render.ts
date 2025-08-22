import { getQueriesForElement, prettyDOM } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { render as renderSvelte } from "svelte/server";
import type { RenderResult, RenderSvelteFn } from "./types.js";

const render = ((...args): ReturnType<RenderSvelteFn> & RenderResult => {
  // biome-ignore lint/suspicious/noExplicitAny: silence Svelte type inference
  const svelteRenderResult = renderSvelte(...(args as [any]));
  const { window } = new JSDOM(
    `<!doctype html><html><body>${svelteRenderResult.body}</body></html>`,
  );
  const { document } = window;
  const { body: container } = document;
  const queries = getQueriesForElement(container);

  return {
    ...svelteRenderResult,
    ...queries,
    window,
    document,
    container,
    pretty: (maxLength = 10000) => prettyDOM(container, maxLength) || "",
  };
}) satisfies RenderSvelteFn;

export default render;
