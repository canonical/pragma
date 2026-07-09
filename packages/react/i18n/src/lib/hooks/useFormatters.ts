import { createFormatters, type Formatters } from "@canonical/i18n-core";
import { useMemo, useSyncExternalStore } from "react";
import useI18nContext from "./useI18nContext.js";

/**
 * Access memoized {@link Formatters} (number, currency, date, time, relative
 * time, list) for the active locale. Re-renders on locale change.
 */
export default function useFormatters(): Formatters {
  const { source } = useI18nContext();
  const locale = useSyncExternalStore(source.subscribe, source.get, source.get);

  return useMemo(() => createFormatters(locale), [locale]);
}
