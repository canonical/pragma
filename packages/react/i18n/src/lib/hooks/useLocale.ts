import { directionOf } from "@canonical/i18n-core";
import { useSyncExternalStore } from "react";
import type { UseLocaleResult } from "./types.js";
import useI18nContext from "./useI18nContext.js";

/**
 * Read and change the active locale. Re-renders the calling component on every
 * locale change — pair it with `LocaleSelector` (or a `<select>`) to switch.
 */
export default function useLocale(): UseLocaleResult {
  const { source, config } = useI18nContext();
  const locale = useSyncExternalStore(source.subscribe, source.get, source.get);

  // Derive direction from the subscribed locale (not the live getter) so it is
  // provably part of the reactive snapshot.
  return {
    locale,
    direction: directionOf(config, locale),
    setLocale: source.set,
    locales: config.locales,
  };
}
