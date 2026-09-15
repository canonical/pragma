import type { ReactNode } from "react";
import type { ColumnAnnouncement } from "./types.js";

/** The words an announcement says, collected so they can be localised in one place. */
const MESSAGES = {
  hidden: "hidden",
  shown: "shown, position",
  moved: "moved to position",
  of: "of",
  alwaysShown: "is always shown",
  reset: "Table settings reset",
} as const;

/**
 * What the table announces after a change to its columns, with the column's
 * own heading: that it was hidden, that it was shown or moved and where it
 * now stands among the shown columns, that it cannot be hidden, or that the
 * table's settings were reset. A switch over every kind, so one added is a
 * compile error here until it has words.
 */
export default function describeColumnChange(
  change: ColumnAnnouncement,
): ReactNode {
  switch (change.kind) {
    case "hidden":
      return (
        <>
          {change.column.header} {MESSAGES.hidden}
        </>
      );
    case "always-shown":
      return (
        <>
          {change.column.header} {MESSAGES.alwaysShown}
        </>
      );
    case "shown":
      return (
        <>
          {change.column.header} {MESSAGES.shown} {change.position}{" "}
          {MESSAGES.of} {change.count}
        </>
      );
    case "moved":
      return (
        <>
          {change.column.header} {MESSAGES.moved} {change.position}{" "}
          {MESSAGES.of} {change.count}
        </>
      );
    case "reset":
      return MESSAGES.reset;
  }
}
