import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import { createStaticRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { RelayEnvironmentProvider } from "react-relay";
import { dirForLocale } from "#lib/i18n/index.js";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly url?: string;
  /** Colour-scheme preference resolved from the request cookie, if any. */
  readonly theme?: "light" | "dark";
  /** Locale resolved from the request cookie / Accept-Language, if any. */
  readonly locale?: string;
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const initialData = props.initialData ?? {};
  const url = initialData.url ?? "/";
  const router = createStaticRouter(appRoutes, url, {
    middleware: [...middleware],
    notFound: notFoundRoute,
  });

  // A fresh Relay environment per server render, so no store state leaks
  // between requests. Nothing fetches through it yet: components that issue
  // queries are wrapped in `ClientOnly` (see CatalogPage) until the follow-up
  // SSR PR adds data serialization/hydration; the provider is here so any
  // component touching Relay context renders without branching on runtime.
  const relayEnvironment = createEnvironment();

  // Paint the cookie-resolved theme on <html> for a flash-free first render —
  // the same element `usePreferredTheme` toggles on the client, and one React
  // does not hydrate (only `#root` is), so there is no mismatch to reconcile.
  return (
    <html
      lang={props.lang}
      dir={dirForLocale(props.lang)}
      className={initialData.theme}
    >
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          <HeadProvider>
            <RelayEnvironmentProvider environment={relayEnvironment}>
              <RouterProvider router={router}>
                <Outlet fallback={<p>Loading…</p>} />
              </RouterProvider>
            </RelayEnvironmentProvider>
          </HeadProvider>
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
