import { toCamelCase } from "@canonical/utils";
import { Parser } from "htmlparser2";
import React from "react";

/**
 * Maps HTML attribute names to their React prop equivalents.
 *
 * React uses camelCase for most DOM attributes, but a handful of common
 * HTML attributes have specific React names that do not follow the general
 * camelCase rule. This dictionary covers those exceptions. Any attribute
 * not listed here falls through to the generic `toCamelCase` converter.
 */
const REACT_KEYS_DICTIONARY: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  crossorigin: "crossOrigin",
  charset: "charSet",
};

/** Tag names that `getOtherHeadElements` collects. */
const HEAD_OTHER_TAGS = new Set(["title", "style", "meta", "base"]);

/**
 * Collected representation of an HTML element extracted during SAX parsing.
 *
 * Mirrors the subset of DOM element data needed to construct a React element:
 * the tag name, its attributes, and optional text content.
 */
interface CollectedElement {
  name: string;
  attribs: Record<string, string>;
  text: string | undefined;
}

/**
 * The three buckets into which `parseHeadElements` dispatches extracted tags.
 */
interface ParseResult {
  links: CollectedElement[];
  scripts: CollectedElement[];
  others: CollectedElement[];
}

/**
 * Parse an HTML string and extract all `<head>` elements of interest.
 *
 * Uses htmlparser2's SAX `Parser` to stream through the HTML in a single
 * pass. Each opening tag that matches a head element type is recorded,
 * and any immediate text content is captured for tags like `<title>` and
 * `<style>` that carry inline text.
 *
 * Elements are returned in document order, grouped into three categories:
 * links, scripts, and everything else (title, style, meta, base).
 *
 * @param html - The full HTML string to parse (typically from a Vite build).
 * @returns Three arrays of collected elements, in document order.
 */
function parseHeadElements(html: string): ParseResult {
  const links: CollectedElement[] = [];
  const scripts: CollectedElement[] = [];
  const others: CollectedElement[] = [];

  let current: CollectedElement | undefined;

  const parser = new Parser({
    onopentag(name, attribs) {
      if (name === "link" || name === "script" || HEAD_OTHER_TAGS.has(name)) {
        current = { name, attribs, text: undefined };
      } else {
        current = undefined;
      }
    },
    ontext(data) {
      if (current) {
        current.text = current.text == null ? data : current.text + data;
      }
    },
    onclosetag(name) {
      if (!current || current.name !== name) return;

      // <link> is void — it never has text children
      if (name === "link") {
        current.text = undefined;
      }

      if (current.name === "link") {
        links.push(current);
      } else if (current.name === "script") {
        scripts.push(current);
      } else {
        others.push(current);
      }

      current = undefined;
    },
  });

  parser.write(html);
  parser.end();

  // Flush any pending <link> that never received an onclosetag.
  // htmlparser2 fires onclosetag for void elements, so this is a defensive
  // guard for edge cases in non-standard HTML or alternative parsers.
  /* v8 ignore next 4 -- defensive: htmlparser2 always fires onclosetag for void elements */
  if (current?.name === "link") {
    current.text = undefined;
    links.push(current);
  }

  return { links, scripts, others };
}

/**
 * Extracts `<head>` elements from an HTML string and converts them to React elements.
 *
 * The primary use case is server-side rendering with Vite: the build process produces
 * an HTML shell containing `<script>`, `<link>`, `<meta>`, `<title>`, `<style>`, and
 * `<base>` tags. This class parses that shell via `parseHeadElements` (a SAX handler —
 * no DOM tree is constructed) and exposes the extracted tags as React elements that the
 * server entrypoint component can inject into its rendered output.
 *
 * Parsing happens once in the constructor. The three getter methods return the
 * elements in the order they appeared in the original HTML.
 */
export default class Extractor {
  /** Parsed head elements, grouped by category. */
  protected readonly parsed: ParseResult;

  /**
   * Create an Extractor for the given HTML string.
   *
   * @param html - The full HTML string to parse (typically from a Vite build).
   */
  constructor(html: string) {
    this.parsed = parseHeadElements(html);
  }

  /**
   * Convert an HTML attribute name to the corresponding React prop name.
   *
   * Checks `REACT_KEYS_DICTIONARY` for known exceptions (e.g. `class` becomes
   * `className`). Falls back to generic camelCase conversion, which correctly
   * handles `data-*` and `aria-*` attributes.
   *
   * @param key - The HTML attribute name, e.g. `"crossorigin"` or `"data-test-id"`.
   * @returns The React prop name, e.g. `"crossOrigin"` or `"dataTestId"`.
   */
  protected convertKeyToReactKey(key: string): string {
    return REACT_KEYS_DICTIONARY[key.toLowerCase()] ?? toCamelCase(key);
  }

  /**
   * Convert a collected element into a `React.createElement` call.
   *
   * Attributes are mapped to React prop names via `convertKeyToReactKey`.
   * A stable `key` prop is synthesised from the tag name and the element's
   * position index so that React can reconcile lists of head elements.
   *
   * If the element has text content (e.g. `<title>My App</title>` or
   * `<style>.body { color: red }</style>`), it is passed as the element's
   * `children` argument.
   *
   * @param element - The collected element data from SAX parsing.
   * @param index - The position of this element within its sibling group.
   * @returns A React element matching the original HTML tag.
   */
  protected convertToReactElement(
    element: CollectedElement,
    index: number,
  ): React.ReactElement {
    const props: Record<string, string> = {};

    for (const [key, value] of Object.entries(element.attribs)) {
      props[this.convertKeyToReactKey(key)] = value;
    }

    props.key = `${element.name}_${index}`;
    return React.createElement(element.name, props, element.text);
  }

  /**
   * Return all `<link>` elements as React elements, in document order.
   *
   * Typically used to inject stylesheet and preload links into the
   * server-rendered `<head>`.
   */
  public getLinkElements(): React.ReactElement[] {
    return this.parsed.links.map((el, i) => this.convertToReactElement(el, i));
  }

  /**
   * Return all `<script>` elements as React elements, in document order.
   *
   * Preserving order is important: Vite dev mode emits module scripts
   * that depend on being evaluated in sequence.
   */
  public getScriptElements(): React.ReactElement[] {
    return this.parsed.scripts.map((el, i) =>
      this.convertToReactElement(el, i),
    );
  }

  /**
   * Return all non-script, non-link head elements as React elements, in document order.
   *
   * This covers `<title>`, `<style>`, `<meta>`, and `<base>`. Elements are returned
   * in the order they appeared in the HTML, preserving inter-type ordering (a `<meta>`
   * between two `<style>` tags stays between them).
   */
  public getOtherHeadElements(): React.ReactElement[] {
    return this.parsed.others.map((el, i) => this.convertToReactElement(el, i));
  }
}
