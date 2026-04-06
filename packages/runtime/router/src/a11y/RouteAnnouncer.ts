interface RouteAnnouncerElementLike {
  textContent: string;
  setAttribute(name: string, value: string): void;
}

interface RouteAnnouncerParentLike {
  appendChild(child: RouteAnnouncerElementLike): void;
}

interface RouteAnnouncerDocumentLike {
  readonly body?: RouteAnnouncerParentLike;
  createElement(tagName: "div"): RouteAnnouncerElementLike;
}

/** Announce route changes through an aria-live region. */
export default class RouteAnnouncer {
  readonly #document: RouteAnnouncerDocumentLike;
  #element: RouteAnnouncerElementLike | null = null;

  constructor(documentLike: RouteAnnouncerDocumentLike) {
    this.#document = documentLike;
  }

  async announce(message: string): Promise<void> {
    const element = this.#ensureElement();

    if (!element) {
      return;
    }

    element.textContent = "";

    if (message.length === 0) {
      return;
    }

    await Promise.resolve();
    element.textContent = message;
  }

  #ensureElement(): RouteAnnouncerElementLike | null {
    if (this.#element) {
      return this.#element;
    }

    const parent = this.#document.body;

    if (!parent) {
      return null;
    }

    const element = this.#document.createElement("div");

    element.setAttribute("aria-atomic", "true");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("role", "status");
    element.setAttribute(
      "style",
      [
        "position:absolute",
        "width:1px",
        "height:1px",
        "padding:0",
        "margin:-1px",
        "overflow:hidden",
        "clip:rect(0, 0, 0, 0)",
        "white-space:nowrap",
        "border:0",
      ].join(";"),
    );
    parent.appendChild(element);
    this.#element = element;

    return element;
  }
}
