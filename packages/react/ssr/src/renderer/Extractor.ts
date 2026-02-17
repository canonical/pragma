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
 * Parses an HTML string to extract and convert script and link tags to React.createElement calls.
 * It extracts all the possible tags from the <head> of an HTML page.
 * These are:
 * - title
 * - style
 * - meta
 * - link
 * - script
 * - base
 */
class Extractor {
  private readonly document: Document;

  constructor(html: string) {
    this.document = parseDocument(html);
  }

  private getElementsByTagName(tagName: string): Element[] {
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

  protected convertKeyToReactKey(key: string): string {
    const reactKey = REACT_KEYS_DICTIONARY[key.toLowerCase()];
    return reactKey ? reactKey : casing.toCamelCase(key);
  }

  private convertToReactElement(
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

  public getLinkElements(): React.ReactElement[] {
    const linkElements = this.getElementsByTagName("link");
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return linkElements.reverse().map(this.convertToReactElement, this);
  }

  public getScriptElements(): React.ReactElement[] {
    const scriptElements = this.getElementsByTagName("script");
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return scriptElements.reverse().map(this.convertToReactElement, this);
  }

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
