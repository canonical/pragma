import type { SavedView } from "../views/index.js";
import type { StoredView } from "./types.js";

/** A stored saved view as this viewer sees it, with whether it is pinned. */
export default function readSavedView(
  record: StoredView,
  pinned: boolean,
): SavedView {
  return {
    id: record.id,
    name: record.name,
    query: record.query,
    presentation: record.presentation,
    revision: record.revision,
    pinned,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
