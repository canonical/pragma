interface ScrollPosition {
  readonly x: number;
  readonly y: number;
}

interface ScrollTargetLike {
  scrollIntoView(): void;
}

interface ScrollDocumentLike {
  getElementById(id: string): ScrollTargetLike | null;
}

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ScrollWindowLike {
  readonly pageXOffset?: number;
  readonly pageYOffset?: number;
  readonly scrollX?: number;
  readonly scrollY?: number;
  scrollTo(position: { left: number; top: number }): void;
}

interface ScrollManagerOptions {
  readonly document?: ScrollDocumentLike;
  readonly sessionStorage?: SessionStorageLike;
  readonly storageKey?: string;
}

function buildUrl(input: string | URL): URL {
  if (input instanceof URL) {
    return new URL(input.href);
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input);
  }

  return new URL(input, "https://router.local");
}

function readPositions(
  sessionStorage: SessionStorageLike | null,
  storageKey: string,
): Record<string, ScrollPosition> {
  if (!sessionStorage) {
    return {};
  }

  const value = sessionStorage.getItem(storageKey);

  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, ScrollPosition>;
  } catch {
    return {};
  }
}

/** Save and restore scroll positions across router navigations. */
export default class ScrollManager {
  readonly #document: ScrollDocumentLike | null;
  readonly #sessionStorage: SessionStorageLike | null;
  readonly #storageKey: string;
  readonly #window: ScrollWindowLike;

  constructor(
    windowLike: ScrollWindowLike,
    options: ScrollManagerOptions = {},
  ) {
    this.#document = options.document ?? null;
    this.#sessionStorage = options.sessionStorage ?? null;
    this.#storageKey =
      options.storageKey ?? "@canonical/router-core:scroll-positions";
    this.#window = windowLike;
  }

  restore(location: string | URL, navigationType: "pop" | "push"): void {
    const href = buildUrl(location).href;
    const savedPosition = readPositions(this.#sessionStorage, this.#storageKey)[
      href
    ];

    if (navigationType === "pop" && savedPosition) {
      this.#window.scrollTo({
        left: savedPosition.x,
        top: savedPosition.y,
      });
      return;
    }

    const url = buildUrl(location);

    if (url.hash.length > 1) {
      const target = this.#document?.getElementById(
        decodeURIComponent(url.hash.slice(1)),
      );

      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    this.#window.scrollTo({ left: 0, top: 0 });
  }

  save(location: string | URL): void {
    const positions = readPositions(this.#sessionStorage, this.#storageKey);
    const href = buildUrl(location).href;

    positions[href] = {
      x: this.#window.scrollX ?? this.#window.pageXOffset ?? 0,
      y: this.#window.scrollY ?? this.#window.pageYOffset ?? 0,
    };

    this.#sessionStorage?.setItem(this.#storageKey, JSON.stringify(positions));
  }
}
