import {
  areFieldsEqual,
  createChannel,
  protectChannel,
} from "../observable/index.js";
import { describeError } from "../source/index.js";
import arePresentationsEqual from "./arePresentationsEqual.js";
import { INITIAL_PRESENTATION_STATE, NO_PRESENTATION } from "./constants.js";
import createMemoryPresentationStore from "./createMemoryPresentationStore.js";
import createPreferenceLayer from "./createPreferenceLayer.js";
import createPreferenceWriter from "./createPreferenceWriter.js";
import spellTargetKey from "./spellTargetKey.js";
import type {
  KeptLayer,
  OwnedPresentation,
  PresentationConfig,
  PresentationState,
  ViewPresentation,
} from "./types.js";

/** The two reads the presentation keeps apart: the defaults' and the shown view's. */
type ReadKey = "default" | "view";

/**
 * Create a provider's presentation: the arrangement in force, layered from
 * the viewer's default arrangement, the open view's saved presentation and
 * the viewer's own changes to that view, merged key by key. The columns'
 * declared defaults sit beneath all three and are the renderer's to fill.
 *
 * Each target's preferences are read when the presentation is observed,
 * when the store changes and when the open view changes; a change not yet
 * sent when a read began, still in flight, or whose write failed wins over
 * it. Changes are written behind, batched per target after `WRITE_DELAY`,
 * and every change still gathering is written when the last observer
 * releases. Every target's layer is kept for the session, so a view shown
 * again keeps the changes made to it, and a write that failed is reported
 * and retried whichever view is shown. Without a store the same record
 * runs over one kept in memory for the session, and nothing claims it was
 * saved.
 *
 * Constructing it reads and subscribes to nothing: the store is first read
 * when something observes the presentation, or a view is shown.
 *
 * @note Impure by design: the presentation holds the layers and the changes
 * gathering to be written; observing subscribes to the store.
 */
export default function createPresentation(
  config: PresentationConfig = {},
): OwnedPresentation {
  const store = config.store ?? createMemoryPresentationStore();
  const state = createChannel<PresentationState>(INITIAL_PRESENTATION_STATE, {
    equals: areFieldsEqual,
  });
  const defaults: KeptLayer = {
    layer: createPreferenceLayer(),
    target: "default",
  };
  /** Every target's layer, kept for the session, by its store key. */
  const layers = new Map<string, KeptLayer>([["default", defaults]]);
  /** The open view's own preferences, or the defaults with none shown. */
  let own: KeptLayer = defaults;
  /** The arrangement the open view was saved with. */
  let saved: ViewPresentation = NO_PRESENTATION;
  /** The view whose own layer `own` is, or null while `own` is the defaults. */
  let shown: string | null = null;
  /** The latest read of each target. */
  const reads: Record<ReadKey, number> = { default: 0, view: 0 };
  /** Why a target's preferences could not be read, or null. */
  const readFailures: Record<ReadKey, string | null> = {
    default: null,
    view: null,
  };
  let observers = 0;
  /** Stops hearing the store, while something observes. */
  let stopHearing: (() => void) | null = null;

  const writer = createPreferenceWriter({
    store,
    publish,
    forget(target) {
      // The store has no such view: its own layer is dropped, so no
      // report and no retry outlive the view. A layer still shown is let
      // go by the session, which leaves the view it hears is gone.
      layers.delete(spellTargetKey(target));
    },
  });

  /** Publish the arrangement in force and what there is to report. */
  function publish(): void {
    const current = state.get();
    const presentation: ViewPresentation = Object.freeze({
      ...defaults.layer.values,
      ...saved,
      ...(shown === null ? {} : own.layer.values),
    });
    let unsaved = false;
    for (const { layer } of layers.values()) {
      if (layer.hasFailed()) {
        unsaved = true;
        break;
      }
    }
    state.set(
      Object.freeze({
        presentation: arePresentationsEqual(presentation, current.presentation)
          ? current.presentation
          : presentation,
        presentationReason:
          readFailures.default ??
          readFailures.view ??
          (unsaved ? writer.failure : null),
      }),
    );
  }

  /**
   * Read one target into its layer. Only the latest read of a target
   * settles; an earlier one answering late, with a value or a failure, is
   * dropped.
   */
  const readTarget = ({ target, layer }: KeptLayer): void => {
    const key: ReadKey = target === "default" ? "default" : "view";
    const token = ++reads[key];
    const since = writer.flushed;
    void store.readPresentation(target).then(
      (read) => {
        if (reads[key] !== token) {
          return;
        }
        layer.settle(read, since);
        readFailures[key] = null;
        publish();
      },
      (error: unknown) => {
        if (reads[key] === token) {
          readFailures[key] = describeError(error);
          publish();
        }
      },
    );
  };

  /**
   * Read the shown view's own preferences, if a view is shown. A read is
   * not taken while nothing observes: the first observer reads anyway.
   */
  const readShownView = (): void => {
    if (observers > 0 && shown !== null) {
      readTarget(own);
    }
  };

  /** Read the default arrangement and the shown view's own preferences. */
  const readPreferences = (): void => {
    if (observers > 0) {
      readTarget(defaults);
      readShownView();
    }
  };

  /** The shown view changed: the last view's read still out answers to nobody. */
  const forgetViewRead = (): void => {
    reads.view += 1;
    readFailures.view = null;
  };

  /** A view's own preferences, made when the view is first shown. */
  const findLayer = (view: string): KeptLayer => {
    const key = spellTargetKey({ view });
    const kept = layers.get(key);
    if (kept !== undefined) {
      return kept;
    }
    const made: KeptLayer = {
      layer: createPreferenceLayer(),
      target: { view },
    };
    layers.set(key, made);
    return made;
  };

  return {
    state: protectChannel(state),

    observe() {
      observers += 1;
      if (observers === 1) {
        stopHearing = store.subscribe(() => {
          readPreferences();
        });
        readPreferences();
      }
      let observing = true;
      return () => {
        if (!observing) {
          return;
        }
        observing = false;
        observers -= 1;
        if (observers === 0) {
          // Changes the viewer made are written, even as the last observer
          // goes: a resize committed a moment before unmount is not lost.
          // Heard no more first, so the write's own notice reads nothing
          // for nobody.
          stopHearing?.();
          stopHearing = null;
          writer.flush();
        }
      };
    },

    refresh() {
      for (const kept of layers.values()) {
        writer.rewrite(kept);
      }
      readPreferences();
    },

    arrange(patch) {
      writer.persist(own, patch);
      publish();
    },

    show(view) {
      saved = view?.presentation ?? NO_PRESENTATION;
      const id = view?.id ?? null;
      if (id !== shown) {
        shown = id;
        own = id === null ? defaults : findLayer(id);
        // Only the view's own preferences are new; the defaults stand, and
        // what the last view's read said is the last view's.
        forgetViewRead();
        readShownView();
      }
      publish();
    },
  };
}
