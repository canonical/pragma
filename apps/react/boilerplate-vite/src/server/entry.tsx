import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly router?: Router<RouteMap, AnyRoute | undefined>;
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const router = props.initialData?.router;

  return (
    <html lang={props.lang}>
      <head>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          {router ? (
            <HeadProvider>
              <RouterProvider router={router}>
                <Outlet fallback={<p>Loading…</p>} />
              </RouterProvider>
            </HeadProvider>
          ) : (
            <p>No router provided.</p>
          )}
        </div>
      </body>
    </html>
  );
}

export type { InitialData };
