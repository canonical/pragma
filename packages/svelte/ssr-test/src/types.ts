import type { BoundFunctions, queries } from "@testing-library/dom";
import type { DOMWindow } from "jsdom";
import type { Component, ComponentProps } from "svelte";

type Queries = BoundFunctions<typeof queries>;

export type RenderResult = Queries & {
  window: DOMWindow;
  document: DOMWindow["document"];
  container: HTMLElement;
  head: string;
  body: string;
  pretty: (maxLength?: number) => string;
};

type SvelteRenderOptions = {
  context?: Map<unknown, unknown>;
  idPrefix?: string;
};

export type RenderFunction = <
  Comp extends Component,
  Props extends ComponentProps<Comp>,
>(
  ...args: Record<never, never> extends Props
    ? [component: Comp, options?: SvelteRenderOptions]
    : [component: Comp, options: SvelteRenderOptions & { props: Props }]
) => RenderResult;
