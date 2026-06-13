import { useContext, useEffect, useId, useRef } from "react";
import applyHeadTagsToDOM from "./applyHeadTagsToDOM.js";
import HeadContext from "./HeadContext.js";
import type { HeadTags } from "./types.js";

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
 * }, [data.name, data.bio, canonicalUrl]);
 * ```
 */
export default function useHead(
  tags: HeadTags,
  deps?: readonly unknown[],
): void {
  const id = useId();
  const { collector } = useContext(HeadContext);
  const managedElementsRef = useRef<Element[]>([]);

  if (collector) {
    collector.add(id, tags);
  }

  useEffect(
    () => {
      if (collector) {
        return () => {
          collector.remove(id);
        };
      }

      managedElementsRef.current = applyHeadTagsToDOM(tags);

      return () => {
        for (const element of managedElementsRef.current) {
          element.remove();
        }

        managedElementsRef.current = [];
      };
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: consumer controls update timing via deps
    deps ? [collector, id, ...deps] : [collector, id, tags],
  );
}
