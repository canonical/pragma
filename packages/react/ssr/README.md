# Canonical React SSR: No-Hassle Server-Side Rendering for React

This guide demonstrates how to set up server-side rendering (SSR) for React applications using `@canonical/react-ssr`. It covers everything from installation to building and handling SSR requests with client and server entry points.

## Table of Contents
1. [Installation](#installation)
2. [Quick Start](#quick-start)
    - [Server-Side Entry Point](#server-side-entry-point)
    - [Client-Side Entry Point](#client-side-entry-point)
    - [Building Your Application](#building-your-application)
    - [Server Request Handling](#server-request-handling)
    - [Injecting the Client Application](#injecting-the-client-application)
3. [Customization](#customization)
    - [Bootstrap Scripts](#bootstrap-scripts)

---

## Installation

First, install the `@canonical/react-ssr` package:

```bash
npm install @canonical/react-ssr
```

## Quick Start

This section walks you through setting up SSR for your React app, including creating entry points, building your app, and handling SSR requests.

### Server-Side Entry Point

Create a server-side entry point to wrap your application and inject the necessary scripts and links into the HTML.

```tsx
// src/ssr/entry-server.tsx
import Application from "../Application.js";
import React from "react";
import type {ReactServerEntrypointComponent, RendererServerEntrypointProps} from "@canonical/react-ssr/renderer";

// Define your server-side entry point component
const EntryServer: ReactServerEntrypointComponent<RendererServerEntrypointProps> = ({ lang = "en", scriptTags, linkTags }) => (
  <html lang={lang}>
    <head>
      <title>Canonical React SSR</title>
      {scriptTags}
      {linkTags}
    </head>
    <body>
      <div id="root">
        <Application />
      </div>
    </body>
  </html>
);

export default EntryServer;
```
This component is responsible for rendering the HTML structure and injecting the necessary script and link tags that are required for hydration on the client.

### Client-Side Entry Point
Set up client-side hydration to rehydrate your app after the SSR content has been rendered.
```tsx
// src/ssr/entry-client.tsx
import { hydrateRoot } from "react-dom/client";
import Application from "../Application.js";

// Hydrate the client-side React app after the server-rendered HTML is loaded
hydrateRoot(document.getElementById("root") as HTMLElement, <Application />);
```

### Building your application
To build your SSR React app, use a tool like Vite, Webpack, or Next. 
The build process should include both client and server bundles. First, build the client-side app, then the server-side entry point.
The example below uses Vite.

```json5
// package.json
{
  "scripts": {
    "build": "bun run build:client && bun run build:server",
    "build:client": "vite build --ssrManifest --outDir dist/client",
    "build:server": "vite build --ssr src/ssr/server.ts --outDir dist/server"
  }
}

```

### Server Request Handling

Once your app is built, you can set up an Express server to handle SSR requests.

```ts
// src/ssr/server.ts
import express from "express";
import { serveStream } from "@canonical/react-ssr/server";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import htmlString from "../../dist/client/index.html?raw";
import EntryServer from "./entry-server.js";

// Set up the JSXRenderer with the server entry point
const Renderer = new JSXRenderer(EntryServer, { htmlString });
const ssrHandler = Renderer.render;

const app = express();

// Serve static assets
app.use("/(assets|public)", express.static("dist/client/assets"));

// Handle SSR requests and render the stream to the client
app.use(serveStream(ssrHandler));
```

- The `JSXRenderer` renders the `EntryServer` component to a stream.
- The `serveStream` controller sends the stream to the client.

### Injecting the Client Application

Your client-side entry point must be executed by the client upon page load to rehydrate the server-rendered app.

Example for injecting the client application into your HTML with Vite:

```html
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Inject the client-side entry point -->
    <script type="module" src="/src/ssr/entry-client.tsx"></script>
  </body>
</html>
```
This script will hydrate the app on the client, connecting the React app to the server-rendered HTML.

#### Customization
You can inject additional bootstrapping scripts to customize the client-side setup. 
This is useful if you need more control over how the client app boots.

##### Bootstrap Scripts
You can pass custom modules, scripts, or inline script content to be executed on the client before the app is hydrated.

###### Options
- `bootstrapModules`: An array of module paths. Generates `<script type="module" src="{SCRIPT_LINK}"></script>` elements.
- `bootstrapScripts`: An array of script paths. Generates `<script type="text/javascript" src="{SCRIPT_LINK}"></script>` elements.
- `bootstrapScriptContent`: Raw script content. Generates `<script type="text/javascript">{SCRIPT_CONTENT}</script>` elements.

```ts
import { JSXRenderer } from "@canonical/react-ssr/renderer";
// Pass custom bootstrap scripts to the renderer
const Renderer = new JSXRenderer(
  EntryServer, 
  { 
    htmlString, 
    renderToPipeableStreamOptions: {
       bootstrapModules: ["src/ssr/entry-client.tsx"] // Adds the client-side entry module to the page
    }
  }
);
```

The `JSXRenderer` also accepts `renderToPipeableStreamOptions`, which are passed to react-dom/server`'s `renderToPipeableStream()`.

For further information, refer to [React's `renderToPipeableStream()` documentation](https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters).



