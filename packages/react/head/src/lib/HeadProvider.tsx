import type { ReactNode } from "react";
import HeadContext from "./HeadContext.js";
import type { HeadCollector } from "./types.js";

export interface HeadProviderProps {
  readonly children: ReactNode;
  readonly collector?: HeadCollector;
}

/**
 * Provide head tag collection context to the component tree.
 *
 * On the server, pass a `collector` from `createHeadCollector()` to capture
 * head tags during render. On the client, omit `collector` — `useHead()` will
 * perform direct DOM mutations on `document.head`.
 */
export default function HeadProvider({
  children,
  collector,
}: HeadProviderProps) {
  return (
    <HeadContext.Provider value={{ collector: collector ?? null }}>
      {children}
    </HeadContext.Provider>
  );
}
