import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildLiveStatePayload } from "../../domains/shared/state/buildStatePayload.js";
import type { PragmaRuntime } from "../../domains/shared/types/index.js";

/** The static URI the live-state resource is served under. */
export const STATE_URI = "pragma://state";

const STATE_DESCRIPTION =
  "Live pragma configuration state: tier, channel, detail, packages — with " +
  "origin, effect, and how to change each (durable vs per-call).";

/**
 * Register the `pragma://state` resource on the MCP server.
 *
 * Static-URI overload, registered ALONGSIDE the `{+uri}` graph-entity
 * template (it does not touch the graph surface). The payload re-reads
 * the config layers from disk on every read, so a `config_*` write during
 * the session IS reflected — the honesty behind the instructions' "re-read
 * pragma://state after any config_* call" caveat.
 *
 * @param server - The MCP server to register the resource on.
 * @param runtime - The pragma runtime providing config, origins, packages.
 */
export default function registerStateResource(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerResource(
    "state",
    STATE_URI,
    { description: STATE_DESCRIPTION, mimeType: "application/json" },
    async (url) => {
      const payload = buildLiveStatePayload(runtime);
      return {
        contents: [
          {
            uri: url.href,
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );
}
