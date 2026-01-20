# @canonical/react-ssr

Server-side rendering utilities for React applications. Provides streaming HTML rendering with `JSXRenderer`, Express middleware with `serveStream`, and automatic script/link tag injection from your build output.

## Installation

```bash
bun add @canonical/react-ssr
```

Peer dependencies: `react`, `react-dom`, `express` (for Express usage).

## Express Server

Create a renderer that wraps your server entry component:

```tsx
// src/ssr/renderer.tsx
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import htmlString from "../../dist/client/index.html?raw";
import EntryServer from "./entry-server.js";

const Renderer = new JSXRenderer(EntryServer, { htmlString });
export default Renderer.render;
```

Create an Express server using `serveStream`:

```ts
// src/ssr/server.ts
import { serveStream } from "@canonical/react-ssr/server";
import express from "express";
import render from "./renderer.js";

const app = express();
app.use("/assets", express.static("dist/client/assets"));
app.use(serveStream(render));
app.listen(5173);
```

Build and run:

```bash
vite build --ssrManifest --outDir dist/client
vite build --ssr src/ssr/server.ts --outDir dist/server
node dist/server/server.js
```

## Bun Server

The renderer works the same way. For Bun's native server, convert the pipeable stream:

```ts
// src/ssr/server-bun.ts
import render from "./renderer.js";
import { Readable } from "node:stream";

Bun.serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static assets
    if (url.pathname.startsWith("/assets")) {
      return new Response(Bun.file(`dist/client${url.pathname}`));
    }

    // SSR render
    const { pipe } = render(req, null);
    const readable = Readable.toWeb(Readable.from(pipeToIterable(pipe)));
    return new Response(readable, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

function pipeToIterable(pipe: (dest: NodeJS.WritableStream) => void) {
  const { Readable } = require("node:stream");
  const passthrough = new (require("node:stream").PassThrough)();
  pipe(passthrough);
  return passthrough;
}
```

Or use Express compatibility mode with Bun:

```ts
// Bun can run Express directly
import app from "./server.js";  // Your Express server
export default app;
```

## Entry Points

### Server Entry

The server entry renders the full HTML document. `scriptTags` and `linkTags` are extracted from your build output and injected automatically:

```tsx
// src/ssr/entry-server.tsx
import type { ReactServerEntrypointComponent, RendererServerEntrypointProps } from "@canonical/react-ssr/renderer";
import Application from "../Application.js";

const EntryServer: ReactServerEntrypointComponent<RendererServerEntrypointProps> = ({
  lang = "en",
  scriptTags,
  linkTags,
}) => (
  <html lang={lang}>
    <head>
      <title>My App</title>
      {linkTags}
    </head>
    <body>
      <div id="root">
        <Application />
      </div>
      {scriptTags}
    </body>
  </html>
);

export default EntryServer;
```

### Client Entry

The client entry hydrates the server-rendered HTML:

```tsx
// src/ssr/entry-client.tsx
import { hydrateRoot } from "react-dom/client";
import Application from "../Application.js";

hydrateRoot(document.getElementById("root")!, <Application />);
```

## Building

Two-phase build with Vite:

```json
{
  "scripts": {
    "build": "bun run build:client && bun run build:server",
    "build:client": "vite build --ssrManifest --outDir dist/client",
    "build:server": "vite build --ssr src/ssr/server.ts --outDir dist/server"
  }
}
```

The client build produces `dist/client/index.html` with bundled script/link tags. The server build imports this HTML string to extract those tags for injection.

## Customization

Pass options to React's `renderToPipeableStream`:

```ts
const Renderer = new JSXRenderer(EntryServer, {
  htmlString,
  renderToPipeableStreamOptions: {
    bootstrapModules: ["src/ssr/entry-client.tsx"],
    onShellReady() { console.log("Shell ready"); },
    onError(err) { console.error(err); },
  },
});
```

Options include:
- `bootstrapModules` - ES modules to load (`<script type="module">`)
- `bootstrapScripts` - Scripts to load (`<script>`)
- `bootstrapScriptContent` - Inline script content

See [React's renderToPipeableStream documentation](https://react.dev/reference/react-dom/server/renderToPipeableStream) for all options.

## Examples

See working examples in the monorepo:
- [`apps/react/boilerplate-vite`](../../../apps/react/boilerplate-vite) - Vite + Express
- [`apps/react/demo`](../../../apps/react/demo) - Full application example
