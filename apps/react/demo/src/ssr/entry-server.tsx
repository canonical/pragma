import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import { type InitialData, default as Shell } from "./Shell.js";

// entry-server page must match exactly the hydrated page in entry-client
const EntryServer: ServerEntrypoint<InitialData> = Shell;

export default EntryServer;
