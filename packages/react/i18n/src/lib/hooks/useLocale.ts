import { useSyncExternalStore } from "react";
import type { UseLocaleResult } from "./types.js";
import useI18nContext from "./useI18nContext.js";

/**
 * Read and change the active locale. Re-renders the calling component on every
 * locale change — pair it with a `<select>` to build a locale switcher.
 */
export default function useLocale(): UseLocaleResult {
  const { source, config } = useI18nContext();
  const locale = useSyncExternalStore(source.subscribe, source.get, source.get);

  return {
    locale,
    direction: source.direction,
    setLocale: source.set,
    locales: config.locales,
  };
}
