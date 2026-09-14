import {
  arePresentationsEqual,
  diffPresentations,
  type ViewPresentation,
} from "../presentation/index.js";
import type { Slice } from "../query/index.js";
import { createSnapshot, type DataViewsSnapshot } from "../snapshot/index.js";
import { encodeQuery } from "../wire/index.js";
import { NO_VIEW_OPEN, RENDERER } from "./constants.js";
import describeNameIssue from "./describeNameIssue.js";
import mintViewId from "./mintViewId.js";
import readStoredQuery from "./readStoredQuery.js";
import type {
  SavedView,
  ViewCommands,
  ViewCommandsConfig,
  ViewDraft,
  ViewSettlement,
  ViewUpdateResult,
} from "./types.js";

/**
 * Create the five saved-view commands over one session: open, save, save
 * as, rename and remove. Each is prepared when its turn in the queue comes
 * — refused at once for a missing view or a bad name, or run against the
 * store — and settles by moving the session's baseline and open view.
 *
 * @note Impure by design: the commands hold the draft of a creation whose
 * outcome never arrived, to retry it under the same id.
 */
export default function createViewCommands(
  config: ViewCommandsConfig,
): ViewCommands {
  const {
    host,
    store,
    presentation,
    state,
    run,
    setBaseline,
    listWith,
    dropView,
    readFirstPage,
  } = config;
  /** A creation whose outcome never arrived, kept to be retried under its id. */
  let draft: ViewDraft | null = null;

  /** A view's query: no window, no annotation, its renderer. */
  const spellViewQuery = (slice: Slice): URLSearchParams =>
    encodeQuery({
      schema: host.schema,
      slice,
      window: null,
      preserve: new URLSearchParams({ as: RENDERER }),
    });

  /** A view's snapshot of a query and the arrangement it keeps. */
  const createViewSnapshot = (
    slice: Slice,
    arrangement: ViewPresentation,
  ): DataViewsSnapshot =>
    createSnapshot({ query: spellViewQuery(slice), presentation: arrangement });

  /**
   * The stored view becomes the open one: saving again overwrites it with a
   * fresh precondition, and a revert applies its query.
   */
  const settleConflict = (view: SavedView): ViewSettlement => ({
    outcome: { status: "conflict", view },
    apply: () => {
      const stored = readStoredQuery(view, host);
      if (stored.issues.length === 0) {
        setBaseline(stored.slice);
      }
      return { current: view, views: listWith(view) };
    },
  });

  const settleUpdate = (
    result: ViewUpdateResult,
    view: SavedView,
    submitted: Slice | null,
  ): ViewSettlement => {
    switch (result.status) {
      case "saved":
        return {
          outcome: result,
          apply: () => {
            // Only the submitted query becomes the baseline: edits made
            // while saving stay modified.
            if (submitted !== null) {
              setBaseline(submitted);
            }
            return {
              current: result.view,
              views: listWith(result.view),
            };
          },
        };
      case "conflict":
        return settleConflict(result.view);
      case "missing":
        return { outcome: result, apply: () => dropView(view.id) };
      case "unreadable":
        return { outcome: result };
    }
  };

  return {
    open(id) {
      return run("open", () => async () => {
        const found = await store.get(id);
        if (found.status !== "found") {
          return { outcome: found };
        }
        const { view } = found;
        const stored = readStoredQuery(view, host);
        if (stored.issues.length > 0) {
          return {
            outcome: { status: "refused", view, issues: stored.issues },
          };
        }
        return {
          outcome: { status: "opened", view },
          apply: () => {
            // In place before the query moves, so it never reads as modified.
            setBaseline(stored.slice);
            // The query and the view's name together: one entry of history.
            host.adopt(
              { slice: stored.slice, window: readFirstPage() },
              "view",
              view.id,
            );
            return { current: view, views: listWith(view) };
          },
        };
      });
    },

    save() {
      return run("save", () => {
        const { current } = state.get();
        if (current === null) {
          return NO_VIEW_OPEN;
        }
        const { slice } = host.state.get();
        // The query alone is saved: the view keeps the arrangement it was
        // created with.
        const query = spellViewQuery(slice).toString();
        return async () =>
          settleUpdate(await store.update(current, { query }), current, slice);
      });
    },

    saveAs(name) {
      return run("save-as", () => {
        const trimmed = name.trim();
        const { slice } = host.state.get();
        const snapshot = createViewSnapshot(
          slice,
          presentation.state.get().presentation,
        );
        const retried =
          draft !== null &&
          draft.name === trimmed &&
          draft.query === snapshot.query &&
          arePresentationsEqual(draft.presentation, snapshot.presentation)
            ? draft
            : null;
        // A retried creation may have landed: its own view takes no name.
        const issue = describeNameIssue(name, state.get(), retried?.id ?? null);
        if (issue !== null) {
          return { status: "invalid", reason: issue };
        }
        const attempt: ViewDraft = {
          id: retried?.id ?? mintViewId(),
          name: trimmed,
          ...snapshot,
        };
        return async () => {
          draft = attempt;
          const result = await store.create(attempt);
          draft = null;
          if (result.status !== "saved") {
            return { outcome: result };
          }
          return {
            outcome: result,
            apply: () => {
              // Changes made while it was saving belong to the new view: the
              // view is shown first, so they land in its own layer.
              // A key the viewer removed meanwhile is written as null:
              // the new view was saved with it, and null masks that.
              const moved = Object.fromEntries(
                Object.entries(
                  diffPresentations(
                    snapshot.presentation,
                    presentation.state.get().presentation,
                  ),
                ).map(([key, value]) => [key, value ?? null]),
              );
              setBaseline(slice);
              presentation.show(result.view);
              if (Object.keys(moved).length > 0) {
                presentation.arrange(moved);
              }
              // Then to the new identity, over the query as it stands.
              const live = host.state.get();
              host.adopt(
                { slice: live.slice, window: live.window },
                "view",
                result.view.id,
              );
              return {
                current: result.view,
                views: listWith(result.view),
              };
            },
          };
        };
      });
    },

    rename(name) {
      return run("rename", () => {
        const { current } = state.get();
        if (current === null) {
          return NO_VIEW_OPEN;
        }
        const issue = describeNameIssue(name, state.get(), current.id);
        if (issue !== null) {
          return { status: "invalid", reason: issue };
        }
        return async () =>
          settleUpdate(
            await store.update(current, { name: name.trim() }),
            current,
            null,
          );
      });
    },

    remove() {
      return run("remove", () => {
        const { current } = state.get();
        if (current === null) {
          return NO_VIEW_OPEN;
        }
        return async () => {
          const result = await store.remove(current);
          if (result.status === "removed") {
            return { outcome: result, apply: () => dropView(current.id) };
          }
          return result.status === "conflict"
            ? settleConflict(result.view)
            : { outcome: result };
        };
      });
    },
  };
}
