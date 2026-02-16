import type { ServerEntrypoint } from "@canonical/react-ssr/renderer";
import Shell, { type InitialData } from "./Shell.js";

const EntryServer: ServerEntrypoint<InitialData> = Shell;

export default EntryServer;
