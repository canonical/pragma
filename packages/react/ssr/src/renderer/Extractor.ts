import { casing } from "@canonical/utils";
import { type Document, Element, NodeWithChildren } from "domhandler";
import { parseDocument } from "htmlparser2";
import React from "react";

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

      if (node instanceof Element) {
        if (node.type === "tag" && node.name === tagName) {
          elements.push(node);
        }
        // Check for script tags specifically
        if (node.type === "script" && tagName === "script") {
          elements.push(node);
        }
      }

      if (node instanceof NodeWithChildren) {
        stack.push(...node.children);
      }
    }

    console.log(`Found ${elements.length} <${tagName}> tags`);
    return elements;
  }

  protected convertKeyToReactKey(key: string): string {
    switch (key.toLowerCase()) {
      case "class":
        return "className";
      case "for":
        return "htmlFor";
      case "crossorigin":
        return "crossOrigin";
      case "charset":
        return "charSet";
      default:
        return casing.toCamelCase(key);
    }
  }

  private convertToReactElement(element: Element): React.ReactElement {
    const props: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(element.attribs)) {
      props[this.convertKeyToReactKey(key)] = value;
    }

    // some tags from <head> have one children of type text
    let elementChildren: string | undefined;
    if (element.children.length === 1 && element.firstChild?.type === "text") {
      elementChildren = element.firstChild.data;
    }

    return React.createElement(element.name, props, elementChildren);
  }

  public getLinkElements(): React.ReactElement[] {
    const linkElements = this.getElementsByTagName("link");
    return linkElements.map(this.convertToReactElement, this).reverse();
  }

  public getScriptElements(): React.ReactElement[] {
    const scriptElements = this.getElementsByTagName("script");
    // reverse keeps the original order in the HTML (they are extracted with a stack in reverse)
    // the order might be important for some scripts (i.e. in Vite Dev mode)
    return scriptElements.map(this.convertToReactElement, this).reverse();
  }

  public getOtherHeadElements(): React.ReactElement[] {
    const otherHeadElements = ["title", "style", "meta", "base"].flatMap(
      (elementName: string) => this.getElementsByTagName(elementName),
    );
    return otherHeadElements.map(this.convertToReactElement, this).reverse();
  }
}

export default Extractor;
