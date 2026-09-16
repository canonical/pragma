import type {
  DataViewsMessages,
  FilterFeedback,
} from "@canonical/dataviews-core";

/**
 * What to say beside a filter's input, in the root's words, or null when
 * there is nothing to say.
 *
 * An invalid, emptied or refused edit retains the applied predicate, so the
 * message says the prior restriction still applies: the results on screen
 * are still filtered, and the text on screen is not what filtered them.
 * `retained` is whether a predicate stands at all, which decides what an
 * emptied input asks for. One message words every refusal, whether the
 * schema gave the one reason or the source gave several.
 */
export default function describeFilterFeedback(
  feedback: FilterFeedback,
  retained: boolean,
  messages: DataViewsMessages,
): string | null {
  switch (feedback.status) {
    case "none":
    case "applied":
      return null;
    case "incomplete":
      return messages.filterIncomplete(retained);
    case "invalid":
      return messages.filterRefused(
        [feedback.reason],
        feedback.retainsPredicate,
      );
    case "refused":
      return messages.filterRefused(
        feedback.refusals.map((refusal) => refusal.reason),
        feedback.retainsPredicate,
      );
  }
}
