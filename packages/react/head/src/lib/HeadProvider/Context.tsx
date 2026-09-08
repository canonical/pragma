import { createContext } from "react";
import type { TitleTemplate } from "./types.js";

/** The default template: a page's title is the document title, verbatim. */
function formatTitleVerbatim(pageTitle: string): string {
  return pageTitle;
}

/**
 * React context carrying the document title template.
 *
 * `HeadProvider` writes to it and `Head` reads it while rendering. It
 * *formats* — it never collects — so it holds no per-render state and is safe
 * on the server, where effects never run.
 */
const HeadContext = createContext<TitleTemplate>(formatTitleVerbatim);

export default HeadContext;
