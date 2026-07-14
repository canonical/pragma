import type { LookupStory } from "./types.js";

/**
 * Resolve the effective `detailed` flag for a lookup story on a surface.
 *
 * Defaults follow the ratified surface contract: the CLI opts in
 * (`detailed` is false unless set) while MCP opts out (`detailed` is true
 * unless set, since agents want full data by default). Stories without a
 * `detailed` parameter are never detailed. A story's `resolveDetailed`
 * override wins — block uses it to let aspect flags imply detail.
 */
export default function resolveLookupDetailed<TDetailed, TFmtInput>(
  story: LookupStory<TDetailed, TFmtInput>,
  surface: "cli" | "mcp",
  params: Record<string, unknown>,
): boolean {
  if (story.resolveDetailed) {
    return story.resolveDetailed(surface, params);
  }
  if (!story.detailedParam) {
    return false;
  }
  if (surface === "mcp") {
    return ((params.detailed as boolean | undefined) ?? true) === true;
  }
  return params.detailed === true;
}
