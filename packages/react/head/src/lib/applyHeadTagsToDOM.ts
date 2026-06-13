import type { HeadTags } from "./types.js";

function applyTitleToDOM(title: string | undefined): void {
  if (title !== undefined) {
    document.title = title;
  }
}

function createMetaElement(attrs: Record<string, string>): HTMLMetaElement {
  const element = document.createElement("meta");

  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }

  return element;
}

function createLinkElement(attrs: Record<string, string>): HTMLLinkElement {
  const element = document.createElement("link");

  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }

  return element;
}

/**
 * Apply head tags to the live DOM, returning the elements that were created
 * so the caller can remove them on cleanup.
 *
 * Safe to call in environments without a DOM (edge runtimes, node test
 * environments): it is a no-op there and returns an empty array.
 */
export default function applyHeadTagsToDOM(tags: HeadTags): Element[] {
  if (typeof document === "undefined") {
    return [];
  }

  const elements: Element[] = [];

  applyTitleToDOM(tags.title);

  if (tags.meta) {
    for (const meta of tags.meta) {
      const attrs: Record<string, string> = {};

      if (meta.name) attrs.name = meta.name;
      if (meta.property) attrs.property = meta.property;
      if (meta.httpEquiv) attrs["http-equiv"] = meta.httpEquiv;
      attrs.content = meta.content;

      const existing = meta.name
        ? document.head.querySelector(`meta[name="${meta.name}"]`)
        : meta.property
          ? document.head.querySelector(`meta[property="${meta.property}"]`)
          : null;

      if (existing) {
        existing.setAttribute("content", meta.content);
      } else {
        const element = createMetaElement(attrs);

        document.head.appendChild(element);
        elements.push(element);
      }
    }
  }

  if (tags.link) {
    for (const link of tags.link) {
      const attrs: Record<string, string> = {
        rel: link.rel,
        href: link.href,
      };

      if (link.type) attrs.type = link.type;
      if (link.sizes) attrs.sizes = link.sizes;
      if (link.media) attrs.media = link.media;
      if (link.crossOrigin) attrs.crossorigin = link.crossOrigin;

      const element = createLinkElement(attrs);

      document.head.appendChild(element);
      elements.push(element);
    }
  }

  return elements;
}
