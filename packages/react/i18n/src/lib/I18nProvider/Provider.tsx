import { createLocaleSource } from "@canonical/i18n-core";
import { type ReactElement, useMemo, useState } from "react";
import I18nContext from "./Context.js";
import type { I18nContextValue, I18nProviderProps } from "./types.js";

/**
 * Provide the i18n runtime to the `useTranslation`, `useLocale`, and
 * `useFormatters` hooks. Mount once around the subtree that renders localized
 * content.
 *
 * Pass the SSR-negotiated `locale` so the server and first client render agree.
 * Supply an external `source` only to share one locale value across frameworks;
 * otherwise the provider owns it.
 */
export default function I18nProvider({
  children,
  config,
  catalogs,
  locale,
  source,
}: I18nProviderProps): ReactElement {
  const [ownSource] = useState(() =>
    createLocaleSource(config, { initial: locale ?? config.defaultLocale }),
  );
  const activeSource = source ?? ownSource;

  const value = useMemo<I18nContextValue>(
    () => ({ source: activeSource, config, catalogs }),
    [activeSource, config, catalogs],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
