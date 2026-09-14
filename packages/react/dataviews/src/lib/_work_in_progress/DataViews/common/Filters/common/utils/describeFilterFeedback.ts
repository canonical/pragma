import type { FilterFeedback } from "@canonical/dataviews-core";
import { composeSentence } from "../../../../../../utils/index.js";

const STILL_APPLIES = "The previous restriction still applies.";

/**
 * What to say beside a filter's input, or null when there is nothing to say.
 *
 * An invalid, emptied or refused edit retains the applied predicate, so the
 * message says the prior restriction still applies: the results on screen
 * are still filtered, and the text on screen is not what filtered them.
 * `retained` is whether a predicate stands at all, which decides what an
 * emptied input asks for.
 */
export default function describeFilterFeedback(
  feedback: FilterFeedback,
  retained: boolean,
): string | null {
  switch (feedback.status) {
    case "none":
    case "applied":
      return null;
    case "incomplete":
      return retained
        ? `Enter a value to change this restriction. ${STILL_APPLIES}`
        : "Enter a value to apply this restriction.";
    case "invalid":
      return feedback.retainsPredicate
        ? `${composeSentence(feedback.reason)} ${STILL_APPLIES}`
        : composeSentence(feedback.reason);
    case "refused": {
      // Every reason the source gave, each as its own sentence.
      const reasons = feedback.refusals
        .map((refusal) => composeSentence(refusal.reason))
        .join(" ");
      return feedback.retainsPredicate
        ? `${reasons} ${STILL_APPLIES}`
        : reasons;
    }
  }
}
