import type { HistoryMode } from "../location/index.js";
import { DEFAULT_HISTORY, FIXED_HISTORY } from "./constants.js";
import type {
  HistoryPolicy,
  QueryTransition,
  TransitionHistory,
} from "./types.js";

/**
 * Resolve the provider's history policy to the mode of every cause. One
 * mode sets every transition a policy may name; a record overrides the
 * defaults per transition; the causes no policy names keep their fixed
 * modes. Spelled member by member, so a transition the policy gains is
 * listed here or fails to compile.
 */
export default function resolveHistoryPolicy(
  policy: HistoryPolicy | undefined,
): TransitionHistory {
  const modeOf = (transition: QueryTransition): HistoryMode =>
    typeof policy === "string"
      ? policy
      : (policy?.[transition] ?? DEFAULT_HISTORY[transition]);
  return Object.freeze({
    filter: modeOf("filter"),
    search: modeOf("search"),
    sort: modeOf("sort"),
    group: modeOf("group"),
    window: modeOf("window"),
    view: modeOf("view"),
    ...FIXED_HISTORY,
  });
}
