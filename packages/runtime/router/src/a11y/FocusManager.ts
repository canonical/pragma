interface FocusOptionsLike {
  readonly preventScroll?: boolean;
}

interface FocusableElementLike {
  focus(options?: FocusOptionsLike): void;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
}

interface FocusDocumentLike {
  querySelector(selector: string): FocusableElementLike | null;
}

interface FocusManagerOptions {
  readonly fallbackSelector?: string;
}

/** Move focus to the primary route heading after navigation. */
export default class FocusManager {
  readonly #document: FocusDocumentLike;
  readonly #fallbackSelector: string;

  constructor(
    documentLike: FocusDocumentLike,
    options: FocusManagerOptions = {},
  ) {
    this.#document = documentLike;
    this.#fallbackSelector = options.fallbackSelector ?? "[data-router-outlet]";
  }

  focus(): boolean {
    const target =
      this.#document.querySelector("h1") ??
      this.#document.querySelector(this.#fallbackSelector);

    if (!target) {
      return false;
    }

    if (target.getAttribute("tabindex") !== "-1") {
      target.setAttribute("tabindex", "-1");
    }

    target.focus({ preventScroll: true });

    return true;
  }
}
