import type { BoundFunctions, queries } from "@testing-library/dom";
import type { DOMWindow } from "jsdom";
import type { Component, ComponentProps } from "svelte";
import type { render as renderSvelte } from "svelte/server";

type Queries = BoundFunctions<typeof queries>;

export type RenderResult = Queries & {
  window: DOMWindow;
  document: DOMWindow["document"];
  container: HTMLElement;
  pretty: (maxLength?: number) => string;
};

// Types based on Svelte's render function, with the problematic typing for Svelte 4 legacy components removed. This can be removed once the legacy component typing is removed from Svelte itself.
export type RenderFn = <
  // biome-ignore lint/suspicious/noExplicitAny: copied from Svelte types
  Comp extends Component<any>,
  Props extends ComponentProps<Comp> = ComponentProps<Comp>,
>(
  // biome-ignore lint/complexity/noBannedTypes: copied from Svelte types
  ...args: {} extends Props
    ? [
        component: Comp,
        options?: {
          props?: Props;
          // biome-ignore lint/suspicious/noExplicitAny: copied from Svelte types
          context?: Map<any, any>;
          idPrefix?: string;
          csp?: { nonce?: string; hash?: boolean };
        },
      ]
    : [
        component: Comp,
        options: {
          props: Props;
          // biome-ignore lint/suspicious/noExplicitAny: copied from Svelte types
          context?: Map<any, any>;
          idPrefix?: string;
          csp?: { nonce?: string; hash?: boolean };
        },
      ]
) => ReturnType<typeof renderSvelte> & RenderResult;
