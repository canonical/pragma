# @canonical/svelte-ssr-test

Utilities for testing **Svelte 5 server-side rendering (SSR)** components with familiar
[`@testing-library/dom`](https://testing-library.com/docs/dom-testing-library/cheatsheet) queries.

It renders a Svelte component via `svelte/server`, mounts the HTML into a `jsdom` document,
and returns a query API (`getByText`, `getByRole`, etc.) plus access to `head`, `body`, and `html`.

---

## Installation

```bash
bun add -D @canonical/svelte-ssr-test
```

## Usage

```ts
import { describe, it, expect } from "vitest";
import { render } from "@canonical/svelte-ssr-test";
import Greeting from "./Greeting.svelte";

describe("Greeting.svelte (SSR)", () => {
  it("renders greeting text", () => {
    const { getByText, window, container } = render(Greeting, {
      props: { name: "World" },
    });

    expect(getByText("Hello World")).toBeInstanceOf(window.HTMLElement);
  });
});
```

### Returned API

- **queries** – All `@testing-library/dom` queries bound to the rendered container
- **window, document** – jsdom `window` and `document`
- **container** – the rendered Svelte component DOM element
- **pretty(maxLength?)** – pretty-prints the container HTML

## Vitest Setup

Recommended options in `vitest.config.ts` or `vite.config.ts` for tests:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // keep pure SSR (avoid jsdom or happy-dom)
  },
});
```

This keeps tests running in a Node environment, while `@canonical/svelte-ssr-test` creates its own `jsdom` instance for DOM queries.

### Why?

- **Familiar API:** Reuse the familiar `@testing-library` query API for assertions, making it easy to write and maintain tests:
  ```ts
  const { getByText } = render(MyComponent);
  expect(getByText("Hello")).toBeInTheDocument();
  ```
- **Comprehensive Output:** Access both raw SSR HTML (`head`, `body`) and a DOM representation (`container`), allowing you to test both the HTML output and DOM behavior:
  ```ts
  const { head, body, container } = render(MyComponent);
  ```
- **Testing Environment:** By using `node` testing environment we make sure svelte SSR rendering is in it's expected server environment compared to having access to browser API with `jsdom`.
