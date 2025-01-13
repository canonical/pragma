import { casing } from "@canonical/utils";
import type { Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import React from "react";

/**
 * Parses an HTML string to extract and convert script and link tags to React.createElement calls.
 */
class Extractor {
  // biome-ignore lint/suspicious/noExplicitAny: explicit any needed for the document type
  private readonly document: any;

  constructor(html: string) {
    this.document = parseDocument(html);
  }

  private getElementsByTagName(tagName: string): Element[] {
    const elements: Element[] = [];
    const stack = [this.document];

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

      if (node.children) {
        stack.push(...node.children);
      }
    }

    console.log(`Found ${elements.length} <${tagName}> tags`);
    return elements;
  }

  private convertKeyToReactKey(key: string): string {
    switch (key.toLowerCase()) {
      case "class":
        return "className";
      case "for":
        return "htmlFor";
      case "crossorigin":
        return "crossOrigin";
      default:
        return casing.toCamelCase(key);
    }
  }

  private convertToReactElement(element: Element): React.ReactElement {
    const props: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(element.attribs)) {
      props[this.convertKeyToReactKey(key)] = value;
    }

    return React.createElement(element.name, props);
  }

  public getLinkTags(): React.ReactElement[] {
    const linkElements = this.getElementsByTagName("link");
    return linkElements.map(this.convertToReactElement, this);
  }

  public getScriptTags(): React.ReactElement[] {
    const scriptElements = this.getElementsByTagName("script");
    return scriptElements.map(this.convertToReactElement, this);
  }
}

export default Extractor;
