import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import { type InitialData, default as RootComponent } from "./RootComponent.js";

// entry-server page must match exactly the hydrated page in entry-client
const EntryServer: ServerEntrypoint<InitialData> = RootComponent;

export default EntryServer;
