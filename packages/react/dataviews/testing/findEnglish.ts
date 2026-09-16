import type { DataViewsMessages } from "@canonical/dataviews-core";
import { MESSAGE_MARK, MESSAGE_SAMPLES } from "./fixtures.js";

/**
 * Where a page's text is the application's data, not the library's words: a
 * cell, a column's own heading, an option of a select.
 */
const DATA_ZONES = [
  // A body cell's own value, but not the selection checkbox beside it nor
  // the status row's text, both of which the record words.
  '[role="cell"]:not(.selection):not(.status)',
  '[role="columnheader"] > .label',
  '[role="columnheader"] > .sort > .label',
  "option",
].join(", ");

/** The attributes a reader hears or sees text from. */
const SPOKEN_ATTRIBUTES = [
  "aria-label",
  "aria-valuetext",
  "title",
  "placeholder",
  "alt",
] as const;

/** Splits a message's text wherever a sample's name, reason or number stood. */
const SAMPLED = new RegExp(`${MESSAGE_MARK}|\\d+`);

/** What the English of one record works out to, worked out once per record. */
const PIECES = new WeakMap<
  DataViewsMessages,
  { readonly words: readonly string[]; readonly phrases: readonly string[] }
>();

/** A piece of a message's words, without the punctuation around it. */
const trimPiece = (piece: string): string =>
  piece.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

/** A path or query a story renders to show where a link leads. */
const IS_LOCATION = /^[/?]|[?&][\w.]+=/;

/**
 * The English the record says of its own, as the words it stands alone as
 * and the phrases it runs: every message's text, and every worded message
 * called with each of its samples, split wherever a sample's name, reason or
 * number stood. A piece with fewer than three letters is too common to look
 * for.
 */
const listEnglishPieces = (
  english: DataViewsMessages,
): {
  readonly words: readonly string[];
  readonly phrases: readonly string[];
} => {
  const held = PIECES.get(english);
  if (held !== undefined) {
    return held;
  }
  const words = new Set<string>();
  const phrases = new Set<string>();
  for (const [key, samples] of Object.entries(MESSAGE_SAMPLES)) {
    const message = english[key as keyof DataViewsMessages];
    const texts =
      typeof message === "string"
        ? [message]
        : (samples ?? []).map((args) =>
            (message as (...args: readonly unknown[]) => string)(...args),
          );
    for (const text of texts) {
      for (const piece of text.split(SAMPLED)) {
        const trimmed = trimPiece(piece);
        if ((trimmed.match(/\p{L}/gu) ?? []).length < 3) {
          continue;
        }
        if (/\s/.test(trimmed)) {
          phrases.add(trimmed);
        } else {
          words.add(trimmed);
        }
      }
    }
  }
  const pieces = { words: [...words], phrases: [...phrases] };
  PIECES.set(english, pieces);
  return pieces;
};

/** Whether `text` says `word` as a word of its own, not inside another. */
const saysWord = (text: string, word: string): boolean =>
  new RegExp(`(?:^|[^\\p{L}])${word}(?:[^\\p{L}]|$)`, "u").test(text);

/**
 * Every piece of English from the record that a page still speaks outside
 * its data: a text node's or a spoken attribute's text saying one of the
 * record's words, or running one of its phrases. Each finding names the
 * piece and the text it was found in.
 *
 * `authored` names text the page's own author wrote — an action a story
 * places in the action bar, the name it gives a search — which is not the
 * library's however alike; text holding one of those phrases is left alone,
 * as is a query string, which a story may render to show where a link
 * leads.
 */
export default function findEnglish(
  root: Element,
  english: DataViewsMessages,
  authored: ReadonlySet<string> = new Set(),
): readonly string[] {
  const { words, phrases } = listEnglishPieces(english);
  const found: string[] = [];
  const inspect = (text: string): void => {
    // A replaced message's token names the message, not its words.
    const spoken = text.replace(/‹[^›]*›/g, " ").trim();
    if (
      spoken === "" ||
      IS_LOCATION.test(spoken) ||
      [...authored].some((phrase) => spoken.includes(phrase))
    ) {
      return;
    }
    for (const word of words) {
      if (saysWord(spoken, word)) {
        found.push(`"${word}" in "${spoken}"`);
      }
    }
    for (const phrase of phrases) {
      if (spoken.includes(phrase)) {
        found.push(`"${phrase}" in "${spoken}"`);
      }
    }
  };
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    if (element.closest(DATA_ZONES) !== null) {
      continue;
    }
    inspect(
      Array.from(element.childNodes)
        .filter((node) => node.nodeType === node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(""),
    );
    for (const attribute of SPOKEN_ATTRIBUTES) {
      inspect(element.getAttribute(attribute) ?? "");
    }
  }
  return found;
}
