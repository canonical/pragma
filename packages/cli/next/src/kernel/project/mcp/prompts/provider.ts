/**
 * The native MCP `prompts/*` provider — the `mcpPrompts` module hook, mirroring
 * the resource provider exactly.
 *
 * `register` wires the low-level `prompts/list` + `prompts/get` request handlers
 * and advertises the `prompts` capability (so the server declares it even with
 * zero prompts — an empty list is a valid, honest surface). Listing is STORELESS
 * (index-backed via {@link listPromptSummaries}); a get is STORE-BACKED (SPARQL
 * via {@link readPrompt}), then the template body is filled with the call's
 * arguments. The SDK request schemas are dynamic-imported inside `register`, so
 * this module — reachable on the capabilities import graph through the prompt
 * module — never pulls the SDK types onto the `--help`/`__complete` fast path.
 *
 * Both handlers open with a STORELESS cold-store pre-check ({@link
 * checkStoreAvailable}) so the native surface converges with the store-backed
 * `prompt_list` tool: a cold store surfaces the SAME `STORE_UNAVAILABLE` +
 * `sources_update` recovery here as the tool's `needsStore` guard raises, rather
 * than a silent `[]` (list) or a bogus "not found" (get) that masks the cold
 * store. When the store is available (including the embedded fallback) both
 * handlers behave exactly as before.
 */

import { checkStoreAvailable } from "../../../runtime/storeReadiness.js";
import type { McpPromptProvider } from "../../../spec/types.js";
import { mcpErrorFrom } from "../mcpError.js";
import { listPromptSummaries, readPrompt } from "./source.js";

/** Substitute `{{arg}}` placeholders in a template body with provided values. */
export function fillTemplate(
  body: string,
  args: Record<string, unknown> | undefined,
): string {
  if (!args) return body;
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
    const value = args[key];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** The native prompt provider (registered by buildServer via `mcpPrompts`). */
export const promptProvider: McpPromptProvider = {
  async register(server, runtime) {
    const {
      ListPromptsRequestSchema,
      GetPromptRequestSchema,
      McpError,
      ErrorCode,
    } = await import("@modelcontextprotocol/sdk/types.js");

    // Advertise the capability even when empty — the surface exists regardless
    // of whether the active graph ships prompt entities.
    server.server.registerCapabilities({ prompts: { listChanged: false } });

    // A STORELESS cold-store pre-check, shared with the store-backed `prompt_list`
    // tool (whose `needsStore` guard throws) and the resource browser: a cold
    // store must present the SAME STORE_UNAVAILABLE + `sources_update` recovery on
    // native `prompts/*` as on the tool surface, not silently list from a stale
    // index (or `[]`) here while the tool errors. Available (incl. the embedded
    // fallback) → the native list stays storeless and the get stays store-backed.
    const guardStore = async (): Promise<void> => {
      const unavailable = checkStoreAvailable(
        await runtime.loadConfig(),
        runtime.cwd,
      );
      if (unavailable) throw mcpErrorFrom(unavailable, { McpError, ErrorCode });
    };

    server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      await guardStore();
      return {
        prompts: listPromptSummaries(runtime).map((prompt) => ({
          name: prompt.name,
          ...(prompt.description ? { description: prompt.description } : {}),
        })),
      };
    });

    server.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      await guardStore();
      const { name, arguments: args } = request.params;
      const entry = await readPrompt(runtime, name);
      if (!entry) {
        // Reached only when the store IS available — a genuine miss, not a cold
        // store (which `guardStore` already surfaced as STORE_UNAVAILABLE).
        throw new McpError(
          ErrorCode.InvalidParams,
          `Prompt "${name}" not found`,
        );
      }
      return {
        ...(entry.description ? { description: entry.description } : {}),
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: fillTemplate(entry.body, args),
            },
          },
        ],
      };
    });
  },
};
