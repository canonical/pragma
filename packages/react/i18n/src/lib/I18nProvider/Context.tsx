import { createContext } from "react";
import type { I18nContextValue } from "./types.js";

/**
 * React context carrying the i18n runtime. `I18nProvider` writes it; the
 * i18n-react hooks read it.
 */
const I18nContext = createContext<I18nContextValue | null>(null);

export default I18nContext;
