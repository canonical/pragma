import { COOKIE_MAX_AGE, DEFAULT_COOKIE_NAME } from "./constants.js";
import directionOf from "./directionOf.js";
import type {
  Direction,
  I18nConfig,
  Locale,
  LocaleSource,
  LocaleSourceOptions,
} from "./types.js";

/** Persist the locale to a cookie. Browser-only; a no-op on the server. */
function writeCookie(name: string, value: Locale): void {
  const env = globalThis as { document?: { cookie: string } };
  /* v8 ignore start -- browser-only effect, exercised through framework bindings */
  if (env.document === undefined) return;
  env.document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  /* v8 ignore stop */
}

/** Reflect the locale onto `<html lang dir>`. Browser-only; a no-op on the server. */
function reflectDocument(locale: Locale, direction: Direction): void {
  const env = globalThis as {
    document?: { documentElement: { lang: string; dir: string } };
  };
  /* v8 ignore start -- browser-only effect, exercised through framework bindings */
  if (env.document === undefined) return;
  env.document.documentElement.lang = locale;
  env.document.documentElement.dir = direction;
  /* v8 ignore stop */
}

/**
 * Create a live, observable locale value — the single cross-framework runtime
 * channel. It holds the current locale, notifies subscribers on change, and (in
 * the browser) persists the choice to a cookie and reflects it onto
 * `<html lang dir>`. On the server those effects are inert, so the same source
 * is safe to construct during SSR.
 *
 * `subscribe` honors the Svelte store contract, so a Svelte component can use
 * `$source` directly, React can pass it to `useSyncExternalStore`, and a Lit
 * reactive controller can subscribe — all from this one object.
 *
 * @param config - Active locale configuration.
 * @param options - Initial locale and effect toggles.
 */
export default function createLocaleSource(
  config: I18nConfig,
  options: LocaleSourceOptions = {},
): LocaleSource {
  const {
    initial = config.defaultLocale,
    persist = true,
    reflect = true,
  } = options;
  const cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
  const subscribers = new Set<(locale: Locale) => void>();
  let current = initial;

  return {
    get: () => current,
    get direction(): Direction {
      return directionOf(config, current);
    },
    set(locale) {
      if (locale === current) return;
      current = locale;
      if (persist) writeCookie(cookieName, locale);
      if (reflect) reflectDocument(locale, directionOf(config, locale));
      for (const run of [...subscribers]) run(current);
    },
    subscribe(run) {
      subscribers.add(run);
      run(current);
      return () => {
        subscribers.delete(run);
      };
    },
  };
}
