/**
 * The MCP resource browser barrel.
 *
 * The `graph-entity` resource surface is a MODULE hook (not a tool), attached to
 * the `graph` capability — `graph inspect` (CLI) and the resource read (MCP)
 * share one entity reader. Exposed here so `graph/index` can hang it off its
 * module and the resources suite can exercise list/complete/read directly.
 */

export {
  buildResourceList,
  type ListedResource,
  rankUriCompletions,
  resourceProvider,
} from "./provider.js";
