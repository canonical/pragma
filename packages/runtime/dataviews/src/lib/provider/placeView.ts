import { VIEW_KEY } from "../wire/index.js";

/**
 * A location's parameters with the open view placed: first when one is open,
 * gone when none is, and every other parameter kept in its order. The given
 * parameters are copied, never changed.
 */
export default function placeView(
  params: URLSearchParams,
  view: string | null,
): URLSearchParams {
  const rest = new URLSearchParams(params);
  rest.delete(VIEW_KEY);
  return view === null
    ? rest
    : new URLSearchParams([[VIEW_KEY, view], ...rest]);
}
