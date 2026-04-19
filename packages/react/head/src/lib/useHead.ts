import { useContext, useEffect, useId, useRef } from "react";
import HeadContext from "./HeadContext.js";
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
 * Declare head tags from any component.
 *
 * Tags mount when the component mounts, update when deps change, and are
 * removed when the component unmounts. On the server with a `HeadProvider`
 * collector, tags are collected for SSR injection instead of DOM mutation.
 *
 * ```tsx
 * useHead({
 *   title: `${data.name} — Profile`,
 *   meta: [{ name: "description", content: data.bio }],
 *   link: [{ rel: "canonical", href: canonicalUrl }],
 * });
 * ```
 */
export default function useHead(tags: HeadTags): void {
  const id = useId();
  const { collector } = useContext(HeadContext);
  const managedElementsRef = useRef<Element[]>([]);

  if (collector) {
    collector.add(id, tags);
  }

  useEffect(() => {
    if (collector) {
      return () => {
        collector.remove(id);
      };
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

    managedElementsRef.current = elements;

    return () => {
      for (const element of managedElementsRef.current) {
        element.remove();
      }

      managedElementsRef.current = [];
    };
  }, [collector, id, tags]);
}
