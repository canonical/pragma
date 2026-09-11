import type { ReactNode } from "react";

/**
 * Compose a page's own title into the document title.
 *
 * Read during render — never in an effect — so the composed title is part of
 * the server-rendered markup as much as the client-rendered DOM.
 */
export type TitleTemplate = (pageTitle: string) => string;

/**
 * Props accepted by `HeadProvider`.
 *
 * Exempt from the native-prop extension convention: `HeadProvider` renders a
 * context provider and no DOM element at all, so it has no root tag whose
 * native props these could extend.
 */
export interface HeadProviderProps {
  /** React children whose `Head` titles are composed by the template. */
  readonly children: ReactNode;
  /**
   * How a page title becomes the document title — a module-scope function,
   * so the context value is referentially stable.
   *
   * Required: a provider without one would format nothing, and `Head` already
   * works with no provider above it.
   */
  readonly titleTemplate: TitleTemplate;
}
