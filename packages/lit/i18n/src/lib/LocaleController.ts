import {
  createFormatters,
  createTranslator,
  type Direction,
  type Formatters,
  type Locale,
  type LocaleSource,
  type Messages,
  type Translator,
} from "@canonical/i18n-core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

interface LocaleSnapshot {
  locale: Locale;
  t: Translator;
  formatters: Formatters;
}

/**
 * A Lit reactive controller that binds a host element to a shared
 * {@link LocaleSource}. It requests a host update on every locale change and
 * exposes the translator and memoized formatters for the active locale.
 *
 * @example
 * class MyElement extends LitElement {
 *   #i18n = new LocaleController(this, source, catalogs);
 *   render() {
 *     return html`<p dir=${this.#i18n.direction}>${this.#i18n.t("nav.home")}</p>`;
 *   }
 * }
 */
export default class LocaleController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #source: LocaleSource;
  readonly #catalogs: Record<Locale, Messages>;
  #unsubscribe: (() => void) | undefined;
  #snapshot: LocaleSnapshot | undefined;

  constructor(
    host: ReactiveControllerHost,
    source: LocaleSource,
    catalogs: Record<Locale, Messages>,
  ) {
    this.#host = host;
    this.#source = source;
    this.#catalogs = catalogs;
    host.addController(this);
  }

  hostConnected(): void {
    this.#unsubscribe = this.#source.subscribe(() =>
      this.#host.requestUpdate(),
    );
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  /** The active locale. */
  get locale(): Locale {
    return this.#source.get();
  }

  /** Writing direction of the active locale. */
  get direction(): Direction {
    return this.#source.direction;
  }

  /** Translator for the active locale. */
  get t(): Translator {
    return this.#current().t;
  }

  /** Memoized formatters for the active locale. */
  get formatters(): Formatters {
    return this.#current().formatters;
  }

  /** Change the active locale. */
  setLocale(locale: Locale): void {
    this.#source.set(locale);
  }

  #current(): LocaleSnapshot {
    const locale = this.#source.get();
    if (this.#snapshot === undefined || this.#snapshot.locale !== locale) {
      this.#snapshot = {
        locale,
        t: createTranslator(locale, this.#catalogs[locale] ?? {}),
        formatters: createFormatters(locale),
      };
    }
    return this.#snapshot;
  }
}
