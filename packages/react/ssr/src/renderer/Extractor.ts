import { casing } from "@canonical/utils";
import { type Document, type Element, NodeWithChildren } from "domhandler";
import { parseDocument } from "htmlparser2";
import React from "react";

const REACT_KEYS_DICTIONARY: { [key: string]: string | undefined } = {
  class: "className",
  for: "htmlFor",
  crossorigin: "crossOrigin",
  charset: "charSet",
};

/**
 * Parses an HTML string to extract and convert the <head> tags to React.createElement calls.
 * The tags extracted are:
 * - title
 * - style
 * - meta
 * - link
 * - script
 * - base
 */
class Extractor {
  /**
   * A document object representing the DOM of a page.
   */
  protected readonly document: Document;

  /**
   * Creates an Extractor object for a given HTML string.
   */
  constructor(html: string) {
    this.document = parseDocument(html);
  }

  /**
   * Searches elements with the specified tag in the document.
   *
   * @remark The method uses the parsed {@link Extractor.document | document} to navigate the
   * whole DOM (usinig a stack) and checks for the elements with the tag name that matches
   * the given parameter.
   */
  protected getElementsByTagName(tagName: string): Element[] {
    const elements: Element[] = [];
    const stack = [...this.document.children];

    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;

      if (node.type === "tag" && node.name === tagName) {
        elements.push(node);
      }
      // Check for script tags specifically
      if (node.type === "script" && tagName === "script") {
        elements.push(node);
      }

      if (node instanceof NodeWithChildren) {
        stack.push(...node.children);
      }
    }

    return elements;
  }

  /**
   * Converts HTML keys to React keys.
   *
   * @remark There are some HTML attributes that don't map exactly to React with the same name.
   * For example, class -> className.
   */
  protected convertKeyToReactKey(key: string): string {
    const reactKey = REACT_KEYS_DICTIONARY[key.toLowerCase()];
    return reactKey ? reactKey : casing.toCamelCase(key);
  }

  /**
   * Converts a parsed {@link domhandler#Element | DOM Element} into a {@link react#React.ReactElement | ReactElement}.
   *
   * @remark The method takes into account the attributes of the parsed {@link domhandler#Element | Element}
   * and passes them as props when creating the {@link react#React.ReactElement | ReactElement}.
   * It only handles children of type "text".
   */
  protected convertToReactElement(
    element: Element,
    index: number,
  ): React.ReactElement {
    const props: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(element.attribs)) {
      props[this.convertKeyToReactKey(key)] = value;
    }

    // some tags from <head> have one children of type text
    let elementChildren: string | undefined;
    if (element.children.length === 1 && element.firstChild?.type === "text") {
      elementChildren = element.firstChild.data;
    }

    props.key = `${element.name}_${index}`;
    return React.createElement(element.name, props, elementChildren);
  }

  /**
   * Finds all <link> elements in the {@link Extractor.document | document} and converts them
   * into {@link react#React.ReactElement | ReactElements}.
   *
   * @remark The list of elements returned will be in order of appearance in the DOM.
   */
  public getLinkElements(): React.ReactElement[] {
    const linkElements = this.getElementsByTagName("link");
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return linkElements.reverse().map(this.convertToReactElement, this);
  }

  /**
   * Finds all <script> elements in the {@link Extractor.document | document} and converts them
   * into {@link react#React.ReactElement | ReactElements}.
   *
   * @remark The list of elements returned will be in order of appearance in the DOM.
   */
  public getScriptElements(): React.ReactElement[] {
    const scriptElements = this.getElementsByTagName("script");
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return scriptElements.reverse().map(this.convertToReactElement, this);
  }

  /**
   * Finds all the <head> elements which are not "script" or "link" in the {@link Extractor.document | document}
   * and converts them into {@link react#React.ReactElement | ReactElements}.
   *
   * @remark The list of elements returned will be in order of appearance in the DOM.
   */
  public getOtherHeadElements(): React.ReactElement[] {
    const otherHeadElements = ["title", "style", "meta", "base"].flatMap(
      (elementName: string) => this.getElementsByTagName(elementName),
    );
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return otherHeadElements.reverse().map(this.convertToReactElement, this);
  }
}

export default Extractor;
