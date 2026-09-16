/**
 * How long the announcer waits after the first of several messages before it
 * speaks them together, in milliseconds: what one interaction says in the
 * same moment reads as one announcement.
 */
export const COALESCE_DELAY_MS = 100;

/**
 * How long an announcement stays in the region once spoken, in milliseconds:
 * long enough for a screen reader to read it from the page, then gone, so the
 * region never accumulates what nobody will read again.
 */
export const CLEAR_DELAY_MS = 7000;

/**
 * The topic an ordering is announced under: what the rows are ordered by has
 * one latest answer, so a second ordering said in the same moment replaces
 * the first rather than being read after it.
 */
export const ORDERING_TOPIC = "ordering";

/**
 * The topic a refused ordering is announced under: why the rows are not
 * ordered as asked has one latest answer, as the ordering itself has, and
 * the two are different answers — a refusal stands beside the ordering it
 * met rather than replacing it.
 *
 * A topic is one subject's latest answer, so an outcome with a subject of
 * its own for every instance — a column that is always shown is one per
 * column — stands under no topic at all, and is read as often as it is
 * said.
 */
export const SORT_REFUSAL_TOPIC = "sort-refusal";
