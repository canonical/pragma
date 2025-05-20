## React Vite Boilerplate

This project provides a template that can be used to quickly create a React Vite
application using the standard set of shared Canonical packages.

#### Running the boilerplate

Run `bun run dev` to run a live development server with HMR.

Run `bun run serve` to run a server-side rendered version of the app using the [React SSR](../../../packages/react/ssr) package.

##### Build/Serve commands

Two mechanisms for building/serving the application are supported:
- CLI-based: Invoke `@canonical/react-ssr`'s `serve-express` bin script to create an express server.
- Middleware-based: Call `@canonical/react-ssr`'s `serveStream()` function to create a middleware that can be used with an existing express server.

In both cases, the client is built the same way (`bun run build:client`).
The server is built differently depending on the approach:
- CLI-based: The server's SSR renderercd module is the entry point. Built with `bun run build:server:cli`, served with `bun run serve:cli`.
- Middleware-based: The server's server script is the entry point. Built with `bun run build:server:middleware`, served with `bun run serve:middleware`.

The current default behavior is to use the middleware-based approach. 
So, `bun run build:server` and `bun run serve` will use the middleware scripts.

In the future, it is intended that the CLI-based approach will be the default, 
and the existing `server.ts` file will be moved to the SSR package as an example.

##### Bin script issues

You may run into an issue where `serve-express` is not linked in `node_modules/.bin` after running `bun i`.
This will result in an error when running `bun run serve:cli`.

To fix this, run `bun i` again.
For more information, see [this documentation](https://github.com/jmuzina/bun-repro/tree/7c9f6eefae2843bc904eabc10db973b56f5e017f/repro/bin-scripts).
