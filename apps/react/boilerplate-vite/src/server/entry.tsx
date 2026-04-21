import { HeadProvider } from "@canonical/react-head";
import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { createServerAppRouter } from "../routes.js";
import "#styles/app.css";

interface InitialData extends Record<string, unknown> {
  readonly url: string;
}

export default function EntryServer(props: ServerEntrypointProps<InitialData>) {
  const url = props.initialData?.url ?? "/";
  const router = createServerAppRouter(url);

  return (
    <html lang={props.lang}>
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
