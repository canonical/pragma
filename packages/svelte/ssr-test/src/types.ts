import type { BoundFunctions, queries } from "@testing-library/dom";
import type { DOMWindow } from "jsdom";
import type { render as renderSvelte } from "svelte/server";

export type RenderSvelteFn = typeof renderSvelte;

type Queries = BoundFunctions<typeof queries>;

export type RenderResult = Queries & {
  window: DOMWindow;
  document: DOMWindow["document"];
  container: HTMLElement;
  pretty: (maxLength?: number) => string;
};
