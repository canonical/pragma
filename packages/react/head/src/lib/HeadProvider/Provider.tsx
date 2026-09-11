import type { ReactElement } from "react";
import HeadContext from "./Context.js";
import type { HeadProviderProps } from "./types.js";

/**
 * Provide the document title template to the component tree.
 *
 * Mount it once, at the root of the application, when page titles should be
 * composed with something shared — usually the site name. Every `Head` below
 * it passes its own `title` through the template; a `Head` with no provider
 * above it uses its title verbatim.
 *
 * Declare the template at module scope, as below, rather than inline: the
 * context carries the function itself, so a stable reference means a re-render
 * of the provider costs its subtree nothing.
 *
 * ```tsx
 * function formatDocumentTitle(pageTitle: string): string {
 *   return `${pageTitle} — Ubuntu`;
 * }
 *
 * <HeadProvider titleTemplate={formatDocumentTitle}>
 *   <App />
 * </HeadProvider>
 * ```
 */
export default function HeadProvider({
  children,
  titleTemplate,
}: HeadProviderProps): ReactElement {
  return (
    <HeadContext.Provider value={titleTemplate}>
      {children}
    </HeadContext.Provider>
  );
}
