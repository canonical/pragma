import type { CollectionState } from "../collection/index.js";
import { createChannel, type ReadonlyChannel } from "../observable/index.js";
import {
  type Query,
  type ResultWindow,
  type Slice,
  sliceEquals,
} from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import { reasonOf, type SourceCapabilities } from "../source/index.js";
import {
  decodeQuery,
  encodeQuery,
  isOwnedKey,
  type QueryIssue,
} from "../wire/index.js";
import type {
  JsonValue,
  PresentationPatch,
  PresentationTarget,
  ProviderViews,
  SavedView,
  ViewAction,
  ViewDraft,
  ViewOutcome,
  ViewPresentation,
  ViewSettledOutcome,
  ViewStore,
  ViewsState,
  ViewUpdateResult,
} from "./types.js";

/** The query authority the views read and drive: their provider's. */
export type ViewsHost = {
  /** The schema a stored query is read against. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /** What the source can execute; a stored clause outside it is refused. */
  readonly capabilities: SourceCapabilities | null;
  /** The live query and window, which "modified" is derived from. */
  readonly state: ReadonlyChannel<CollectionState<object>>;
  /** Adopt a view's query and window together. */
  readonly adopt: (query: Query) => void;
};

/** Configuration of one provider's views. */
export type ProviderViewsConfig = {
  readonly host: ViewsHost;
  readonly store: ViewStore;
};

/** The provider's views, with what only the provider calls. */
export type OwnedViews = ProviderViews & {
  /** Forget the open view, as a scope rotation resets the query. */
  readonly forget: () => void;
  /** Detach from the store and the host for good. */
  readonly dispose: () => void;
};

/** The renderer a saved query names; the table is the only one so far. */
const RENDERER = "table";

/**
 * How long presentation changes gather before they are written: a burst —
 * a column resized by key, one step per press — is written once.
 */
const WRITE_DELAY = 200;

const NO_PRESENTATION: ViewPresentation = Object.freeze({});

const MISSING: ViewOutcome = Object.freeze({ status: "missing" });

const INITIAL: ViewsState = Object.freeze({
  listing: Object.freeze({ status: "idle" }),
  views: Object.freeze([]),
  unreadable: Object.freeze([]),
  current: null,
  modified: false,
  operation: null,
  presentation: NO_PRESENTATION,
  presentationFailure: null,
});

/**
 * A fresh view id: 128 random bits in hex. `getRandomValues`, unlike
 * `randomUUID`, is there outside secure contexts too.
 */
const mintId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

/** A name as two views may not share it: trimmed, normalized, case folded. */
const nameKey = (name: string): string =>
  name.trim().normalize("NFC").toLocaleLowerCase();

/** Whether two states are the same in every field: publishing one tells nobody. */
const sameFields = (a: ViewsState, b: ViewsState): boolean =>
  (Object.keys(a) as (keyof ViewsState)[]).every((key) => a[key] === b[key]);

const byName = (a: SavedView, b: SavedView): number =>
  a.name.localeCompare(b.name);

const samePresentation = (
  a: ViewPresentation,
  b: ViewPresentation,
): boolean => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        JSON.stringify(a[key]) === JSON.stringify(b[key]),
    )
  );
};

/**
 * One target's preferences, with the change that last wrote each key here
 * and the keys whose last write failed.
 */
type Layer = {
  values: Record<string, JsonValue>;
  readonly changed: Map<string, number>;
  readonly failed: Set<string>;
};

const emptyLayer = (): Layer => ({
  values: {},
  changed: new Map(),
  failed: new Set(),
});

/**
 * Take a read into a layer. A key not yet sent when the read began, or whose
 * write failed, keeps its value here: the read cannot know it.
 */
const settleLayer = (
  layer: Layer,
  read: ViewPresentation,
  since: number,
): void => {
  const values: Record<string, JsonValue> = { ...read };
  for (const [key, change] of layer.changed) {
    if (change <= since && !layer.failed.has(key)) {
      continue;
    }
    // An own property only: a key naming a prototype member has no value
    // just because the prototype has that member.
    const value = Object.hasOwn(layer.values, key)
      ? layer.values[key]
      : undefined;
    if (value === undefined) {
      delete values[key];
    } else {
      values[key] = value;
    }
  }
  layer.values = values;
};

/**
 * What a write settles to: its outcome, and how to apply it to the views —
 * which runs only while the scope it was made in is still current.
 */
type Settlement = {
  readonly outcome: ViewSettledOutcome;
  readonly apply?: () => Partial<ViewsState>;
};

/** A creation as this client makes it: always with its presentation. */
type Attempt = ViewDraft & { readonly presentation: ViewPresentation };

/**
 * What an operation does when its turn comes: refuse at once with an
 * outcome, or write.
 */
type Prepared = ViewOutcome | (() => Promise<Settlement>);

/**
 * Create a provider's saved views over the store the application gave it.
 *
 * The open view's identity lives here and its query in the provider: opening
 * a view adopts its query, and "modified" compares the live query with the
 * one the view was opened or saved at. Edits to a view name the revision
 * they were read at, so a view changed in another tab conflicts instead of
 * being overwritten; after a conflict the stored view is the open one, and
 * the user chooses to overwrite it, save a new view or discard the changes.
 * An operation still in flight when the scope rotates answers its caller
 * and changes nothing.
 *
 * Presentation is layered: the viewer's default arrangement, then the open
 * view's saved presentation, then the viewer's own changes to that view.
 * Each target's preferences are read when the views are observed and when
 * the store changes; a change not yet sent when a read began, or whose
 * write failed, wins over it.
 *
 * Constructing it reads nothing: the store is first read when something
 * observes the views.
 */
export default function createProviderViews(
  config: ProviderViewsConfig,
): OwnedViews {
  const { host, store } = config;
  const state = createChannel<ViewsState>(INITIAL, { equals: sameFields });
  /** The query the open view was opened or saved at, or null. */
  let baseline: Slice | null = null;
  const defaults = emptyLayer();
  /** The open view's own preferences. */
  let own = emptyLayer();
  /** Bumped when the scope rotates or the views are disposed. */
  let generation = 0;
  let listRead = 0;
  let preferenceRead = 0;
  let changes = 0;
  /** The last change a flush has sent. */
  let flushed = 0;
  /** Why the preferences could not be read, or null. */
  let readFailure: string | null = null;
  /** Why the latest failed preference write failed. */
  let writeFailure = "";
  let observers = 0;
  let unsubscribe = (): void => {};
  let queue: Promise<unknown> = Promise.resolve();
  /** Presentation changes not yet written, merged by target. */
  const queued = new Map<
    string,
    {
      readonly layer: Layer;
      readonly target: PresentationTarget;
      readonly patch: Record<string, JsonValue | undefined>;
    }
  >();
  let flushing: ReturnType<typeof setTimeout> | null = null;
  /** A creation whose outcome never arrived, kept to be retried under its id. */
  let draft: Attempt | null = null;
  let disposed = false;

  const modifiedNow = (): boolean =>
    baseline !== null && !sliceEquals(baseline, host.state.get().slice);

  const publish = (changed: Partial<ViewsState>): void => {
    if (disposed) {
      return;
    }
    const next = { ...state.get(), ...changed };
    const presentation: ViewPresentation = Object.freeze({
      ...defaults.values,
      ...next.current?.presentation,
      ...own.values,
    });
    const unsaved = defaults.failed.size > 0 || own.failed.size > 0;
    const published: ViewsState = {
      ...next,
      modified: modifiedNow(),
      presentation: samePresentation(presentation, next.presentation)
        ? next.presentation
        : presentation,
      presentationFailure: readFailure ?? (unsaved ? writeFailure : null),
    };
    state.set(Object.freeze(published));
  };

  const stopHost = host.state.subscribe(() => {
    if (state.get().modified !== modifiedNow()) {
      publish({});
    }
  });

  const queryText = (slice: Slice): string =>
    encodeQuery({
      schema: host.schema,
      slice,
      window: null,
      preserve: new URLSearchParams({ as: RENDERER }),
    }).toString();

  /**
   * A stored query as this collection reads it. A parameter naming no field
   * of the collection is refused rather than left out, since leaving it out
   * would widen the query. The renderer is not checked: a query applies in
   * any renderer.
   */
  const decode = (
    view: SavedView,
  ): { readonly slice: Slice; readonly issues: readonly QueryIssue[] } => {
    const params = new URLSearchParams(view.query);
    const { slice, issues } = decodeQuery({
      schema: host.schema,
      params,
      capabilities: host.capabilities,
    });
    const unknown = [...new Set(params.keys())]
      .filter((key) => key !== "as" && !isOwnedKey(key, host.schema.hasField))
      .map((key) => ({
        parameter: key,
        reason: `"${key}" names no field of this collection`,
      }));
    return { slice, issues: [...issues, ...unknown] };
  };

  /** The first page of the current page size. */
  const firstPage = (): ResultWindow => ({
    ...host.state.get().window,
    page: 1,
    cursor: null,
    // A view carries its own grouping, and a collapsed path names a group
    // of the grouping it was made under: none of them survives the change.
    collapsed: [],
  });

  /** The listed views with this one in them, as the store now has it. */
  const listedWith = (view: SavedView): readonly SavedView[] =>
    Object.freeze(
      [...state.get().views.filter(({ id }) => id !== view.id), view].sort(
        byName,
      ),
    );

  /** Drop a view: its identity and its own preferences; the query stays. */
  const leave = (id: string): Partial<ViewsState> => {
    baseline = null;
    own = emptyLayer();
    return {
      current: null,
      views: state.get().views.filter((view) => view.id !== id),
    };
  };

  const list = (): void => {
    const token = ++listRead;
    void store.list().then(
      ({ views, unreadable }) => {
        if (token !== listRead) {
          return;
        }
        const { current } = state.get();
        publish({
          // Deleted elsewhere: the identity goes, the query stays.
          ...(current !== null && !views.some(({ id }) => id === current.id)
            ? leave(current.id)
            : {}),
          listing: { status: "ready" },
          views: Object.freeze([...views].sort(byName)),
          unreadable,
        });
      },
      (error: unknown) => {
        if (token === listRead) {
          publish({
            listing: { status: "failed", reason: reasonOf(error) },
          });
        }
      },
    );
  };

  const readPreferences = (
    current: SavedView | null = state.get().current,
  ): void => {
    const token = ++preferenceRead;
    const since = flushed;
    const layer = own;
    void Promise.all([
      store.readPresentation("default"),
      current === null
        ? NO_PRESENTATION
        : store.readPresentation({ view: current.id }),
    ]).then(
      ([read, viewRead]) => {
        if (token !== preferenceRead) {
          return;
        }
        settleLayer(defaults, read, since);
        // A view that left meanwhile settles into a layer no longer shown.
        settleLayer(layer, viewRead, since);
        readFailure = null;
        publish({});
      },
      (error: unknown) => {
        if (token === preferenceRead) {
          readFailure = reasonOf(error);
          publish({});
        }
      },
    );
  };

  const refresh = (): void => {
    list();
    readPreferences();
  };

  /** Write every change gathered so far, each target's merged into one. */
  const flush = (): void => {
    flushed = changes;
    if (flushing !== null) {
      clearTimeout(flushing);
      flushing = null;
    }
    for (const { layer, target, patch } of queued.values()) {
      // Each key as written; a change made since owns the key now.
      const written = new Map(
        Object.keys(patch).map((key) => [key, layer.changed.get(key)]),
      );
      const settle = (failure: string | null): void => {
        for (const [key, change] of written) {
          if (layer.changed.get(key) !== change) {
            continue;
          }
          if (failure === null) {
            layer.failed.delete(key);
          } else {
            layer.failed.add(key);
            writeFailure = failure;
          }
        }
        publish({});
      };
      void store.patchPresentation(target, patch).then(
        (result) => {
          settle(
            result.status === "saved" ? null : "the view no longer exists",
          );
        },
        (error: unknown) => {
          settle(reasonOf(error));
        },
      );
    }
    queued.clear();
  };

  /** Change a target's preferences at once, and write the change behind. */
  const persist = (
    layer: Layer,
    target: PresentationTarget,
    patch: PresentationPatch,
  ): void => {
    // Gone for good: nothing more is written.
    if (disposed) {
      return;
    }
    const token = ++changes;
    const key = JSON.stringify(target);
    const gathered = queued.get(key)?.patch ?? {};
    for (const [name, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete layer.values[name];
      } else {
        layer.values[name] = value;
      }
      layer.changed.set(name, token);
      gathered[name] = value;
    }
    queued.set(key, { layer, target, patch: gathered });
    flushing ??= setTimeout(flush, WRITE_DELAY);
  };

  /** Write again every key of a layer whose last write failed. */
  const rewrite = (layer: Layer, target: PresentationTarget): void => {
    if (layer.failed.size > 0) {
      persist(
        layer,
        target,
        Object.fromEntries(
          [...layer.failed].map((key) => [key, layer.values[key]]),
        ),
      );
    }
  };

  /** Run operations one at a time, in call order, each to an outcome. */
  const run = (
    action: ViewAction,
    prepare: () => Prepared,
  ): Promise<ViewOutcome> => {
    const ran = queue.then(async (): Promise<ViewOutcome> => {
      const at = generation;
      const prepared = prepare();
      if (typeof prepared !== "function") {
        // A refused name is the name form's to show, not the status's.
        if (prepared.status !== "invalid") {
          publish({
            operation: { action, status: "settled", outcome: prepared },
          });
        }
        return prepared;
      }
      publish({ operation: { action, status: "pending" } });
      const settled = await prepared().catch(
        (error: unknown): Settlement => ({
          outcome: { status: "failed", reason: reasonOf(error) },
        }),
      );
      if (generation === at) {
        publish({
          ...settled.apply?.(),
          operation: { action, status: "settled", outcome: settled.outcome },
        });
      }
      return settled.outcome;
    });
    // A listener that throws rejects its own operation, never the next one.
    queue = ran.catch(() => {});
    return ran;
  };

  /**
   * The stored view becomes the open one: saving again overwrites it with a
   * fresh precondition, and a reset applies its query.
   */
  const conflicted = (view: SavedView): Settlement => ({
    outcome: { status: "conflict", view },
    apply: () => {
      const decoded = decode(view);
      if (decoded.issues.length === 0) {
        baseline = decoded.slice;
      }
      return { current: view, views: listedWith(view) };
    },
  });

  const updated = (
    result: ViewUpdateResult,
    view: SavedView,
    submitted: Slice | null,
  ): Settlement => {
    switch (result.status) {
      case "saved":
        return {
          outcome: result,
          apply: () => {
            // Only the submitted query becomes the baseline: edits made
            // while saving stay modified.
            if (submitted !== null) {
              baseline = submitted;
            }
            return { current: result.view, views: listedWith(result.view) };
          },
        };
      case "conflict":
        return conflicted(result.view);
      case "missing":
        return { outcome: result, apply: () => leave(view.id) };
      case "unreadable":
        return { outcome: result };
    }
  };

  /**
   * Why a name cannot be given to a view, or null. It is checked against
   * every listed view and the open one, so it waits for the listing.
   */
  const nameIssue = (name: string, except: string | null): string | null => {
    const key = nameKey(name);
    if (key === "") {
      return "a view needs a name";
    }
    const { listing, views, current } = state.get();
    if (listing.status !== "ready") {
      return "the saved views are not listed, so the name cannot be checked";
    }
    const taken = [...views, ...(current === null ? [] : [current])].find(
      (view) => view.id !== except && nameKey(view.name) === key,
    );
    return taken === undefined
      ? null
      : `a view named "${taken.name}" already exists`;
  };

  return {
    state,

    observe() {
      observers += 1;
      if (observers === 1) {
        unsubscribe = store.subscribe(refresh);
        if (state.get().listing.status === "idle") {
          publish({ listing: { status: "pending" } });
        }
        refresh();
      }
      let observing = true;
      return () => {
        if (!observing) {
          return;
        }
        observing = false;
        observers -= 1;
        if (observers === 0) {
          unsubscribe();
        }
      };
    },

    reload() {
      rewrite(defaults, "default");
      const { current } = state.get();
      if (current !== null) {
        rewrite(own, { view: current.id });
      }
      refresh();
    },

    open(id) {
      return run("open", () => async () => {
        const found = await store.get(id);
        if (found.status !== "found") {
          return { outcome: found };
        }
        const { view } = found;
        const decoded = decode(view);
        if (decoded.issues.length > 0) {
          return {
            outcome: { status: "refused", view, issues: decoded.issues },
          };
        }
        return {
          outcome: { status: "opened", view },
          apply: () => {
            // In place before the query moves, so it never reads as modified.
            baseline = decoded.slice;
            own = emptyLayer();
            readPreferences(view);
            host.adopt({ slice: decoded.slice, window: firstPage() });
            return { current: view, views: listedWith(view) };
          },
        };
      });
    },

    reset() {
      if (baseline !== null) {
        host.adopt({ slice: baseline, window: firstPage() });
        // Discarding the changes settles what the last operation left, but
        // not one still running.
        publish(
          state.get().operation?.status === "pending"
            ? {}
            : { operation: null },
        );
      }
    },

    save() {
      return run("save", () => {
        const { current } = state.get();
        if (current === null) {
          return MISSING;
        }
        const { slice } = host.state.get();
        return async () =>
          updated(
            await store.update(current, { query: queryText(slice) }),
            current,
            slice,
          );
      });
    },

    saveAs(name) {
      return run("saveAs", () => {
        const trimmed = name.trim();
        const { slice } = host.state.get();
        const query = queryText(slice);
        const { presentation } = state.get();
        const retried =
          draft !== null &&
          draft.name === trimmed &&
          draft.query === query &&
          samePresentation(draft.presentation, presentation)
            ? draft
            : null;
        // A retried creation may have landed: its own view takes no name.
        const issue = nameIssue(name, retried?.id ?? null);
        if (issue !== null) {
          return { status: "invalid", reason: issue };
        }
        const attempt: Attempt = {
          id: retried?.id ?? mintId(),
          name: trimmed,
          query,
          presentation,
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
              // Changes made while it was saving belong to the new view.
              const now = state.get().presentation;
              const moved: Record<string, JsonValue | undefined> = {};
              for (const key of new Set([
                ...Object.keys(now),
                ...Object.keys(presentation),
              ])) {
                if (
                  JSON.stringify(now[key]) !== JSON.stringify(presentation[key])
                ) {
                  moved[key] = now[key];
                }
              }
              baseline = slice;
              own = emptyLayer();
              if (Object.keys(moved).length > 0) {
                persist(own, { view: result.view.id }, moved);
              }
              return { current: result.view, views: listedWith(result.view) };
            },
          };
        };
      });
    },

    rename(name) {
      return run("rename", () => {
        const { current } = state.get();
        if (current === null) {
          return MISSING;
        }
        const issue = nameIssue(name, current.id);
        if (issue !== null) {
          return { status: "invalid", reason: issue };
        }
        return async () =>
          updated(
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
          return MISSING;
        }
        return async () => {
          const result = await store.remove(current);
          if (result.status === "removed") {
            return { outcome: result, apply: () => leave(current.id) };
          }
          return result.status === "conflict"
            ? conflicted(result.view)
            : { outcome: result };
        };
      });
    },

    arrange(patch) {
      const { current } = state.get();
      if (current === null) {
        persist(defaults, "default", patch);
      } else {
        persist(own, { view: current.id }, patch);
      }
      publish({});
    },

    forget() {
      generation += 1;
      const { current } = state.get();
      publish({
        ...(current === null ? {} : leave(current.id)),
        operation: null,
      });
    },

    dispose() {
      // Changes the viewer made are written, even as the collection goes.
      flush();
      generation += 1;
      disposed = true;
      unsubscribe();
      stopHost();
    },
  };
}
