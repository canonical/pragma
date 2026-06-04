import { HeadProvider } from "@canonical/react-head";
import { InitialDataProvider } from "@canonical/react-hooks";
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

  // Apply the cookie-resolved theme to #root so the first server paint matches
  // the user's preference (the design tokens' `.dark`/`.light` rules apply to
  // any ancestor). `usePreferredTheme` keeps the class in sync after hydration.
  return (
    <html lang={props.lang}>
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root" className={initialData.theme}>
          <InitialDataProvider value={initialData}>
            <HeadProvider>
              <RouterProvider router={router}>
                <Outlet fallback={<p>Loading…</p>} />
              </RouterProvider>
            </HeadProvider>
          </InitialDataProvider>
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
