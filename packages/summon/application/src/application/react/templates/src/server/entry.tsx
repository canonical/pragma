import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import { createStaticRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly url?: string;
  /** Colour-scheme preference resolved from the request cookie, if any. */
  readonly theme?: "light" | "dark";
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const initialData = props.initialData ?? {};
  const url = initialData.url ?? "/";
  const router = createStaticRouter(appRoutes, url, {
    middleware: [...middleware],
    notFound: notFoundRoute,
  });

  // Paint the cookie-resolved theme on <html> for a flash-free first render —
  // the same element `usePreferredTheme` toggles on the client, and one React
  // does not hydrate (only `#root` is), so there is no mismatch to reconcile.
  return (
    <html lang={props.lang} className={initialData.theme}>
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          <HeadProvider>
            <RouterProvider router={router}>
              <Outlet fallback={<p>Loading…</p>} />
            </RouterProvider>
          </HeadProvider>
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
