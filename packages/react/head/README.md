# @canonical/react-head

Declarative head management for React. A page renders `<Head>` with its
`<title>`, `<meta>` and `<link>` tags; React 19 hoists them into the
document's `<head>` — during server rendering as much as on the client.

There is no collection step, no effect and no DOM mutation, so the tags are in
the server-rendered HTML a crawler reads, not just in the DOM a browser builds
after hydration.

No dependency on the router — works with any React app.

## Installation

```bash
bun add @canonical/react-head
```

Requires React 19: hoisting head tags from anywhere in the tree is a React 19
feature.

## Quick start

```tsx
import { Head } from "@canonical/react-head";

export default function ProfilePage({ user }) {
  return (
    <section>
      <Head
        title={user.name}
        meta={[
          { name: "description", content: user.bio },
          { property: "og:image", content: user.avatarUrl },
        ]}
        link={[{ rel: "canonical", href: `https://example.com/u/${user.id}` }]}
      />
      <h1>{user.name}</h1>
    </section>
  );
}
```

Nothing else is required. The tags mount with the component, update when its
props change, and are removed when it unmounts — on the server they are simply
part of the rendered document.

`meta` and `link` entries take the attributes their elements take, so a page
can also declare `<link rel="preload" as="image" fetchPriority="high">` for its
largest image, or `rel="alternate" hrefLang` for its translations.

Two React rules to know. A `<link rel="stylesheet">` is hoisted only when it
also carries a `precedence` — and one that does becomes a *resource*, which
React deduplicates by `href` and leaves in place when the component unmounts,
unlike every other tag here. And a tag carrying `itemProp`, or a `<link>`
carrying `onLoad` or `onError`, is not hoisted at all; the types exclude those
so the mistake cannot be made silently.

## One owner per document

**Only a route's leaf component may render `Head`. Layouts and shells must
not.**

This is forced by the platform rather than chosen: HTML takes the *first*
`<title>` in tree order, and a parent renders before its children, so a
layout's title would beat the page's in the server-rendered HTML. The same
goes for the HTML shell — the server renderer emits the shell's own head tags
ahead of the hoisted ones, so an `index.html` used for server rendering must
not carry a `<title>`, or any other tag a page will declare, or the shell's
copy wins.

Share a suffix through `HeadProvider` instead of a second `Head`.

## Composing titles

`HeadProvider` supplies a title template: a pure function from the page's own
title to the document title, read while rendering.

```tsx
import { Head, HeadProvider } from "@canonical/react-head";

function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} — Ubuntu`;
}

function App() {
  return (
    <HeadProvider titleTemplate={formatDocumentTitle}>
      <Router />
    </HeadProvider>
  );
}
```

A page then names only itself — `<Head title="Profile" />` renders
`<title>Profile — Ubuntu</title>`. `titleTemplate` is required: a provider
without one would format nothing, and `Head` works with no provider above it.
Declare the template at module scope, as above, so the context value stays
referentially stable across renders.

## Server rendering

`Head` needs no server-specific wiring. Render a full document — an `<html>`
element with `<head>` and `<body>` — through `renderToPipeableStream`,
`renderToReadableStream` or `renderToString`, and React places the tags in the
`<head>` it emits. `@canonical/react-ssr`'s `JSXRenderer` already renders that
shape.

Do not let the component that renders `Head` suspend. React can only hoist a
tag into a `<head>` it has already flushed. Sitting inside a Suspense boundary
is fine — with `@canonical/router-react` every routed page does — but a
component that actually suspends has its tags streamed in later, with the rest
of its markup, inside `<body>`, where a crawler reading only the head will not
see them. Render `Head` above whatever suspends.

## Public API

- `Head` — declare `title`, `meta` and `link` for the current page.
- `HeadProvider` — supply the `titleTemplate` used to compose page titles.
- `HeadProps`, `HeadProviderProps`, `TitleTemplate` — the prop types.
- `HeadMeta`, `HeadLink` — the `meta` and `link` entry shapes.
