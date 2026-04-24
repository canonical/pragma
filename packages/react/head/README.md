# @canonical/react-head

Declarative head management for React. Components declare `<title>`, `<meta>`, and `<link>` tags via `useHead()`. Tags mount with the component, update on change, and are removed on unmount. SSR collection via `createHeadCollector()` captures tags during server rendering for injection into the HTML template.

No dependency on the router — works with any React app.

## Installation

```bash
bun add @canonical/react-head
```

Requires `react` as a peer dependency.

## Quick start

### Client

```tsx
import { HeadProvider, useHead } from "@canonical/react-head";

function App() {
  return (
    <HeadProvider>
      <Shell>
        <Page />
      </Shell>
    </HeadProvider>
  );
}

function Shell({ children }) {
  useHead({ title: "My App" });
  return <main>{children}</main>;
}

function Page() {
  useHead({
    title: "User Profile — My App",
    meta: [
      { name: "description", content: "User profile page" },
      { property: "og:image", content: "/images/profile.png" },
    ],
    link: [
      { rel: "canonical", href: "https://example.com/profile" },
    ],
  });

  return <h1>Profile</h1>;
}
```

On the client, `useHead()` performs direct DOM mutations on `document.head`. Tags are scoped to the component — navigating away removes the route's tags, the shell's tags remain (because the shell never unmounts).

### Server (SSR)

```tsx
import { createHeadCollector, HeadProvider } from "@canonical/react-head";
import { renderToPipeableStream } from "react-dom/server";

const headCollector = createHeadCollector();

const { pipe } = renderToPipeableStream(
  <HeadProvider collector={headCollector}>
    <App />
  </HeadProvider>,
  {
    onShellReady() {
      const headHtml = headCollector.toHtml();
      res.write(`<!doctype html><html><head>${headHtml}</head><body>`);
      pipe(res);
    },
  },
);
```

During SSR, `useHead()` writes to the collector instead of the DOM. After the shell renders (`onShellReady`), call `toHtml()` to serialize the collected tags. Shell-level tags (base title, viewport meta) are available immediately. Route-specific tags from suspended components are applied during client-side hydration.

## Tag merging

When multiple components call `useHead()`, the following rules apply:

- **`title`** — last writer wins. The deepest component in the tree takes priority.
- **`meta` by `name` or `property`** — deduplicated by key. The deepest component's value wins.
- **`link`** — accumulated. All link tags from all components are rendered.

This means the shell can set a base title and description, and each route overrides them with page-specific values.

## Public API

- `HeadProvider` — React context provider. On the server, pass a `collector`. On the client, omit it.
- `useHead(tags)` — declare head tags from any component.
- `createHeadCollector()` — create an SSR collector with `add()`, `remove()`, and `toHtml()`.
- `HeadTags` — type for `{ title?, meta?, link? }`.
- `HeadMeta` — type for meta tag attributes.
- `HeadLink` — type for link tag attributes.
- `HeadCollector` — type for the SSR collector interface.
