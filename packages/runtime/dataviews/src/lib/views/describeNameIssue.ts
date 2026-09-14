import foldViewName from "./foldViewName.js";
import type { ViewsState } from "./types.js";

/**
 * Why a name cannot be given to a view, or null. It is checked against
 * every listed view and the open one, so it waits for the listing; the
 * view named by `except` may keep its own name.
 */
export default function describeNameIssue(
  name: string,
  state: ViewsState,
  except: string | null,
): string | null {
  const key = foldViewName(name);
  if (key === "") {
    return "a view needs a name";
  }
  const { listing, views, current } = state;
  if (listing.status !== "ready") {
    return "the saved views are not listed, so the name cannot be checked";
  }
  const taken = [...views, ...(current === null ? [] : [current])].find(
    (view) => view.id !== except && foldViewName(view.name) === key,
  );
  return taken === undefined
    ? null
    : `a view named "${taken.name}" already exists`;
}
