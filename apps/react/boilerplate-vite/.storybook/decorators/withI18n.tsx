import { I18nProvider } from "@canonical/i18n-react";
import type { ElementType } from "react";
import { catalogs, i18nConfig } from "../../src/i18n/index.js";

/**
 * Storybook decorator that wraps stories in the app's `I18nProvider`, so any
 * component calling `useTranslation` / `useLocale` / `useFormatters` renders
 * in isolation.
 *
 * The locale comes from the `locale` toolbar global declared in
 * `.storybook/preview.ts`; the provider is keyed on it so switching the
 * toolbar remounts the story in the new language.
 *
 * @example
 * ```ts
 * decorators: [withI18n()]
 * ```
 */
const withI18n =
  () => (Story: ElementType, context: { globals: { locale?: string } }) => {
    const locale = context.globals.locale ?? i18nConfig.defaultLocale;

    return (
      <I18nProvider
        key={locale}
        config={i18nConfig}
        catalogs={catalogs}
        locale={locale}
      >
        <Story />
      </I18nProvider>
    );
  };

export default withI18n;
