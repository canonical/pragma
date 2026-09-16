import type { DataViewsMessages } from "@canonical/dataviews-core";
import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { useMemo } from "react";
import type { UseMessagesResult } from "./types.js";
import useStableValue from "./useStableValue.js";

/** What a root given no messages resolves: nothing over the English record. */
const NO_MESSAGES: Partial<DataViewsMessages> = Object.freeze({});

/** Whether two sets of messages say the same: the same members, each identical. */
const areMessagesEqual = (
  a: Partial<DataViewsMessages>,
  b: Partial<DataViewsMessages>,
): boolean => {
  const keys = Object.keys(a) as (keyof DataViewsMessages)[];
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
  );
};

/**
 * The words a root speaks: the application's messages over the English
 * record, held at one identity while they say the same. An application that
 * writes its messages inline rebuilds the object on every render; while its
 * members are the same strings and the same functions, nothing that reads
 * the words renders again. A worded message written inline is a new function
 * each render, so it words the same but re-renders its readers.
 *
 * Held through the package's own answer to referential stability, so there
 * is one such comparison rather than two.
 */
export default function useMessages(
  messages: Partial<DataViewsMessages> = NO_MESSAGES,
): UseMessagesResult {
  const given = useStableValue(messages, areMessagesEqual);
  return useMemo(() => resolveMessages(given), [given]);
}
