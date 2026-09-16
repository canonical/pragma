import type { SortDirection } from "../query/index.js";
import type { ViewCommand } from "../views/index.js";

/** The word each direction reads as in English. */
export const DIRECTIONS: Readonly<Record<SortDirection, string>> = {
  asc: "ascending",
  desc: "descending",
};

/** How an English message starts when a saved-view command did not happen. */
export const NOT_DONE: Readonly<Record<ViewCommand, string>> = {
  open: "Not opened",
  save: "Not saved",
  "save-as": "Not saved",
  rename: "Not renamed",
  remove: "Not deleted",
};

/** What an English message says of a saved-view command in flight. */
export const PENDING: Readonly<Record<ViewCommand, string>> = {
  open: "Opening the view…",
  save: "Saving…",
  "save-as": "Saving…",
  rename: "Renaming…",
  remove: "Deleting…",
};

/** What the earlier restriction does while an edit cannot apply. */
export const STILL_APPLIES = "The previous restriction still applies.";
