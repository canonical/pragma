import {
  areFieldsEqual,
  createChannel,
  protectChannel,
} from "../observable/index.js";
import {
  areListsEqual,
  areSlicesEqual,
  type ResultWindow,
  type Slice,
} from "../query/index.js";
import { describeError } from "../source/index.js";
import { INITIAL_VIEWS_STATE } from "./constants.js";
import createCommandQueue from "./createCommandQueue.js";
import createViewCommands from "./createViewCommands.js";
import readStoredQuery from "./readStoredQuery.js";
import type {
  OwnedSavedViews,
  SavedView,
  SavedViewsConfig,
  SavedViewsHost,
  ViewsState,
} from "./types.js";

const compareByName = (a: SavedView, b: SavedView): number =>
  a.name.localeCompare(b.name);

/** Whether two listed views are the same view at the same revision, pinned alike. */
const isSameListing = (a: SavedView, b: SavedView): boolean =>
  a.id === b.id && a.revision === b.revision && a.pinned === b.pinned;

/**
 * Create a provider's saved-view session over the store the application
 * gave it.
 *
 * The open view's id lives on the host, beside the query, as the
 * location's `view`: opening a view moves the query and the id together
 * in one entry of history, and reverting to a view or leaving one respells
 * that entry in place. "Modified" compares the live query with the one the
 * view was opened or saved at. An id the host holds that the session did
 * not open itself — the location's on load, or after Back — is opened from
 * the listing once there is one, its stored query the baseline; an id no
 * listed view answers to loses its identity and never the query.
 *
 * Edits to a view name the revision they were read at, so a view changed in
 * another tab conflicts instead of being overwritten; after a conflict the
 * stored view is the open one, and the user chooses to overwrite it, save a
 * new view or discard the changes. Whenever the open view changes, the
 * presentation is shown it, so the arrangement it was saved with is layered;
 * the session reads the presentation and never the reverse.
 *
 * Constructing it reads and subscribes to nothing: the store is first read
 * and the query first followed when something observes the views, and the
 * last release stops both.
 *
 * @note Impure by design: the session holds the open view and its baseline;
 * observing subscribes to the store and the host.
 */
export default function createSavedViews(
  config: SavedViewsConfig,
): OwnedSavedViews {
  const { host, store, presentation } = config;
  const state = createChannel<ViewsState>(INITIAL_VIEWS_STATE, {
    equals: areFieldsEqual,
  });
  /** The query the open view was opened or saved at, or null. */
  let baseline: Slice | null = null;
  let listRead = 0;
  let observers = 0;
  /** Stops hearing the store and the host, while something observes. */
  let stopFollowing: (() => void) | null = null;
  /** True while the session moves the host itself, so the move is not followed. */
  let moving = false;

  const isModifiedNow = (): boolean =>
    baseline !== null && !areSlicesEqual(baseline, host.state.get().slice);

  const publish = (changed: Partial<ViewsState>): void => {
    const before = state.get();
    const next: ViewsState = Object.freeze({
      ...before,
      ...changed,
      modified: isModifiedNow(),
    });
    state.set(next);
    if (next.current !== before.current) {
      presentation.show(next.current);
    }
  };

  const queue = createCommandQueue({ publish });

  /** Whether the live query has moved from the open view's, republished. */
  const followHost = (): void => {
    if (state.get().modified !== isModifiedNow()) {
      publish({});
    }
  };

  /** The first page of the current page size. */
  const readFirstPage = (): ResultWindow => ({
    ...host.state.get().window,
    page: 1,
    cursor: null,
    // A view carries its own grouping, and a collapsed path names a group
    // of the grouping it was made under: none of them survives the change.
    collapsed: [],
  });

  const moveHost: SavedViewsHost["adopt"] = (query, cause, view) => {
    moving = true;
    try {
      host.adopt(query, cause, view);
    } finally {
      moving = false;
    }
  };

  /**
   * Drop the host's open view, keeping the query. Every caller drops the
   * view the host holds: the session only ever holds the id the host does.
   */
  const leaveHostView = (): void => {
    const { slice, window } = host.state.get();
    moveHost({ slice, window }, "revert", null);
  };

  /** Drop a view: its identity goes, from the host too; the query stays. */
  const dropView = (id: string): Partial<ViewsState> => {
    baseline = null;
    leaveHostView();
    return {
      current: null,
      views: state.get().views.filter((view) => view.id !== id),
    };
  };

  /**
   * Open the view the host names when it is not the open one: from the listing,
   * once there is one. An id no listed view answers to, or one whose stored
   * query the collection cannot read whole, is left: its identity goes, never
   * the query.
   */
  const followView = (): void => {
    const id = host.view.get();
    const { current, listing, views } = state.get();
    if (moving || id === (current?.id ?? null)) {
      return;
    }
    if (id === null) {
      baseline = null;
      publish({ current: null });
      return;
    }
    if (listing.status !== "ready") {
      // Named, not yet known: the view it replaced is no longer open, so no
      // save or revert acts on it; the listing that succeeds opens that id.
      if (current !== null) {
        baseline = null;
        publish({ current: null });
      }
      return;
    }
    const view = views.find((listed) => listed.id === id);
    if (view !== undefined) {
      const stored = readStoredQuery(view, host);
      if (stored.issues.length === 0) {
        baseline = stored.slice;
        publish({ current: view });
        return;
      }
    }
    baseline = null;
    leaveHostView();
    publish({ current: null });
    // No view opens: an arrangement restored under that id is let go.
    presentation.show(null);
  };

  const list = (): void => {
    const token = ++listRead;
    void store.list().then(
      ({ views, unreadable }) => {
        if (token !== listRead) {
          return;
        }
        const { current, views: listed } = state.get();
        const sorted = Object.freeze([...views].sort(compareByName));
        publish({
          // Deleted elsewhere: the identity goes, the query stays.
          ...(current !== null && !views.some(({ id }) => id === current.id)
            ? dropView(current.id)
            : {}),
          listing: { status: "ready" },
          // A listing that says the same thing keeps its identity, so a
          // store notice about something else re-renders no picker.
          views: areListsEqual(listed, sorted, isSameListing) ? listed : sorted,
          unreadable,
        });
        followView();
      },
      (error: unknown) => {
        if (token === listRead) {
          publish({
            listing: { status: "failed", reason: describeError(error) },
          });
        }
      },
    );
  };

  const readable = protectChannel(state);
  const commands = createViewCommands({
    // Every move the commands make is the session's own, so it is not followed.
    host: { ...host, adopt: moveHost },
    store,
    presentation,
    state: readable,
    run: queue.run,
    setBaseline(slice) {
      baseline = slice;
    },
    /** The listed views with this one in them, as the store now has it. */
    listWith: (view) =>
      Object.freeze(
        [...state.get().views.filter(({ id }) => id !== view.id), view].sort(
          compareByName,
        ),
      ),
    dropView,
    readFirstPage,
  });

  return {
    ...commands,
    state: readable,

    observe() {
      observers += 1;
      if (observers === 1) {
        const stopStore = store.subscribe(list);
        // One notification per move, once the query and the view have both
        // moved: the open view is followed first, so "modified" is decided
        // once, against the baseline the move leads to.
        const stopMoves = host.transitions.subscribe(() => {
          followView();
          followHost();
        });
        stopFollowing = () => {
          stopStore();
          stopMoves();
        };
        // The id may have moved while nothing observed: followed as a move is,
        // the view first.
        followView();
        followHost();
        if (state.get().listing.status === "idle") {
          publish({ listing: { status: "pending" } });
        }
        list();
      }
      let observing = true;
      return () => {
        if (!observing) {
          return;
        }
        observing = false;
        observers -= 1;
        if (observers === 0) {
          stopFollowing?.();
          stopFollowing = null;
        }
      };
    },

    refresh: list,

    revert() {
      if (baseline !== null) {
        // The view reverted to stays open beside its query.
        moveHost(
          { slice: baseline, window: readFirstPage() },
          "revert",
          host.view.get(),
        );
        // Discarding the changes settles what the last command left, but
        // not one still running.
        publish(
          state.get().command?.status === "pending" ? {} : { command: null },
        );
      }
    },

    forget() {
      queue.abandon();
      // The identity goes and the baseline with it; the view stays listed,
      // since it still exists.
      baseline = null;
      publish({ current: null, command: null });
    },
  };
}
