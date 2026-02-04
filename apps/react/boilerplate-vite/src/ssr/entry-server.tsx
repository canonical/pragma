import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import RootComponent, { type InitialData } from "./RootComponent.js";

const EntryServer: ServerEntrypoint<InitialData> = RootComponent;

export default EntryServer;
