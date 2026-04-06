import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import type { RouterDehydratedState, RouteMap } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import Navigation from "../Navigation.js";
import { createServerAppRouter } from "../routes.js";
import Shell, { type InitialData } from "./Shell.js";

const EntryServer: ServerEntrypoint<InitialData> = (props) => {
  const initialData = props.initialData as
    | RouterDehydratedState<RouteMap>
    | undefined;
  const router = createServerAppRouter(initialData);

  return (
    <RouterProvider router={router}>
      <Shell {...props} navigation={<Navigation />}>
        <Outlet
          fallback={<p className="route-fallback">Loading route…</p>}
        />
      </Shell>
    </RouterProvider>
  );
};

export default EntryServer;
