import { createElement, Fragment, type ReactNode } from "react";

/**
 * What stands in a message's text for a name that is not text, so the
 * message can place it: characters from Unicode's private use area, which
 * no message's own words contain.
 */
const MARK = "\uE000";

/** Splits a worded message at every placed name, keeping each name's index. */
const PLACED = /\uE000(\d+)\uE000/;

/**
 * A message worded around names that may be more than text: a column's
 * heading drawn as an element, placed wherever the message puts it. `word`
 * calls the message with `place(name)` for each name; text names are placed
 * as themselves, and the message comes back as its text. Any other name is
 * placed by a mark and put back as the node itself, so a message places a
 * heading however it is drawn — though a message that altered a mark, rather
 * than placing it, loses that name.
 */
export default function composeMessage(
  word: (place: (name: ReactNode) => string) => string,
): ReactNode {
  const nodes: ReactNode[] = [];
  const text = word((name) => {
    if (typeof name === "string" || typeof name === "number") {
      return String(name);
    }
    nodes.push(name);
    return `${MARK}${nodes.length - 1}${MARK}`;
  });
  if (nodes.length === 0) {
    return text;
  }
  return text
    .split(PLACED)
    .map((piece, at) =>
      createElement(
        Fragment,
        { key: at },
        at % 2 === 0 ? piece : nodes.at(Number(piece)),
      ),
    );
}
