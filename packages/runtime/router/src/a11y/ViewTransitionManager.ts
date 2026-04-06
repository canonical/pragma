interface ViewTransitionLike {
  readonly finished?: Promise<void>;
}

interface ViewTransitionDocumentLike {
  startViewTransition?(
    update: () => void | Promise<void>,
  ): ViewTransitionLike | undefined;
}

/** Wrap route updates in document.startViewTransition when available. */
export default class ViewTransitionManager {
  readonly #document: ViewTransitionDocumentLike;

  constructor(documentLike: ViewTransitionDocumentLike) {
    this.#document = documentLike;
  }

  async run(update: () => void | Promise<void>): Promise<void> {
    if (!this.#document.startViewTransition) {
      await update();
      return;
    }

    let updateResult: Promise<void> | void | null = null;
    const transition = this.#document.startViewTransition(() => {
      updateResult = update();
      return updateResult;
    });

    if (updateResult !== null) {
      await updateResult;
    }

    await transition?.finished;
  }
}
