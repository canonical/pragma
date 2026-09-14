import { VIEW_KEY } from "./constants.js";

/**
 * The saved view a set of parameters has open: the first non-blank `view`
 * value, or null. A blank value is a form control left empty, as it is for
 * every other parameter, and names no view.
 */
export default function readOpenView(params: URLSearchParams): string | null {
  return params.getAll(VIEW_KEY).find((value) => value !== "") ?? null;
}
