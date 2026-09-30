import { createTranslator, directionOf } from "@canonical/i18n-core";
import { useMemo, useSyncExternalStore } from "react";
import type { UseTranslationResult } from "./types.js";
import useI18nContext from "./useI18nContext.js";

/**
 * Access the translator for the active locale. Re-renders the calling component
 * whenever the locale changes.
 */
export default function useTranslation(): UseTranslationResult {
  const { source, catalogs, config } = useI18nContext();
  const locale = useSyncExternalStore(source.subscribe, source.get, source.get);
  const t = useMemo(
    () => createTranslator(locale, catalogs[locale] ?? {}),
    [locale, catalogs],
  );

  return { t, locale, direction: directionOf(config, locale) };
}
