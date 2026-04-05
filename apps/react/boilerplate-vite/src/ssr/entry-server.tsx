// @ts-nocheck
import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import { RouterProvider, ServerRouter } from "@canonical/router-react";
import Navigation from "../Navigation.js";
import { type AppInitialData, createServerAppRouter } from "../routes.js";
import Shell, { type InitialData } from "./Shell.js";

const EntryServer: ServerEntrypoint<InitialData> = (props) => {
  const initialData = props.initialData as AppInitialData | undefined;
  const router = createServerAppRouter(initialData);

  return (
    <Shell
      {...props}
      navigation={
        <RouterProvider router={router}>
          <Navigation />
        </RouterProvider>
      }
    >
      <ServerRouter
        fallback={<p className="route-fallback">Loading route…</p>}
        router={router}
      />
    </Shell>
  );
};

export default EntryServer;
