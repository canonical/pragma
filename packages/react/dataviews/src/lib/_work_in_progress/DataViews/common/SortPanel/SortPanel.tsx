import type { SortTerm } from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { Button } from "@canonical/react-ds-global";
import {
  type FocusEvent,
  type ReactElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import {
  ORDERING_TOPIC,
  SORT_REFUSAL_TOPIC,
} from "../../../../common/index.js";
import { useIsHydrated, useMergedRef } from "../../../../hooks/index.js";
import { describeOrdering } from "../../../../utils/index.js";
import { useAppliedSort, useDataViewsRoot } from "../../hooks/index.js";
import type { DataViewsSortPanelProps } from "./types.js";

const componentCssClassName = "ds data-views-sort-panel";

/** The ordering with one of its terms moved by `offset` places, the rest in order. */
const moveTerm = (
  sort: readonly SortTerm[],
  term: SortTerm,
  offset: number,
): readonly SortTerm[] =>
  sort
    .filter((other) => other !== term)
    .toSpliced(sort.indexOf(term) + offset, 0, term);

/**
 * The collection's ordering as a list: the discoverable path to an ordering
 * of several terms, and one that needs no modifier key.
 *
 * Each of the reader's own terms is listed in precedence order with its
 * direction, and can be moved up, moved down or removed; every change goes
 * through `setSort`, as a header's does, and the root's announcer says the
 * ordering it leaves, or why the source refused it. Every word is the root's
 * messages'. While the reader states no term,
 * the panel says what orders the rows instead: the source's own order, or
 * that nothing does. A term whose column a table hides is listed all the
 * same: hiding a column changes no ordering, so the panel is where a hidden
 * sorted column's sort is still seen and changed.
 *
 * Before scripts run, each move and removal is a real link to the ordering
 * it leads to, spelled by the provider's encoder from the first page, where
 * the provider has a location to lead to; once they run, a button, and a
 * reader already on a link keeps focus on the button that replaces it.
 * Deliberately rough: its design comes later.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function SortPanel({
  label,
  className,
  ref,
  ...rest
}: DataViewsSortPanelProps): ReactElement {
  const { provider, messages, announce } = useDataViewsRoot("SortPanel");
  // The terms alone: a result arriving re-renders no panel.
  const sort = useAppliedSort({ provider });
  // Its buttons work only once scripts run: the server and the hydrating
  // render offer links instead.
  const hydrated = useIsHydrated();
  const baseId = useId();
  /** A term as the panel names it: by its field, with its direction. */
  const describe = ({ field, direction }: SortTerm): string =>
    messages.sortTerm(field, direction);
  /**
   * Apply an ordering one of the panel's controls leads to, and say what it
   * did through the root's announcer, under the ordering's topic: the
   * ordering now in force — the source's own once the reader states none — or
   * why the source refused it, under the refusal's topic, since a refusal is
   * not an ordering. Each term is named by its field, as the panel lists it;
   * a heading names it where a table's own heading changed it.
   *
   * @note Impure: sets the collection's ordering and speaks through the
   * root's announcer.
   */
  const applyOrdering = (next: readonly SortTerm[]): void => {
    const refusals = provider.setSort(next);
    if (refusals.length > 0) {
      // Every reason the source gave, as a refused filter reports them.
      announce(
        messages.sortRefused(refusals.map(({ reason }) => reason)),
        SORT_REFUSAL_TOPIC,
      );
      return;
    }
    announce(
      describeOrdering(
        provider.state.get().slice.sort,
        provider.capabilities.sort.default,
        (field) => field,
        messages,
      ),
      ORDERING_TOPIC,
    );
  };
  const { spellQuery } = readProviderHost(provider);
  /**
   * Where a changed ordering leads without scripts: the same query from its
   * first page, as `?query`, or null where there is no location to lead to.
   */
  const spellOrdering = (next: readonly SortTerm[]): string | null => {
    const { slice, window: queryWindow } = provider.state.get();
    const params = spellQuery({
      slice: { ...slice, sort: next },
      // A new ordering is a new window: the page counted rows in the old one.
      window: { ...queryWindow, page: 1, cursor: null },
    });
    return params === null ? null : `?${params}`;
  };

  // The control last focused inside the list, until focus leaves it. A
  // button disabled or removed while focused reports no blur, so focus
  // would be stranded on nothing. It moves to the same term's Remove while
  // that term is still listed, to the Remove now standing where the term
  // stood once it is gone, and to the panel itself once no term is left.
  const focused = useRef<HTMLElement | null>(null);
  // The term that control acts on, and where it stood when focus arrived.
  const focusedTerm = useRef({ field: "", place: 0 });
  const root = useRef<HTMLElement | null>(null);
  // The panel's own reference, merged with a caller's, so neither is dropped.
  const attachRoot = useCallback((element: HTMLElement) => {
    root.current = element;
    return () => {
      root.current = null;
    };
  }, []);
  const attach = useMergedRef(ref, attachRoot);
  useLayoutEffect(() => {
    const control = focused.current;
    if (
      control === null ||
      (control.isConnected && !control.matches(":disabled"))
    ) {
      return;
    }
    focused.current = null;
    const { field, place } = focusedTerm.current;
    const removes = root.current?.querySelectorAll<HTMLElement>(".remove");
    const fallback =
      Array.from(removes ?? []).find(
        (button) => button.dataset["field"] === field,
      ) ??
      removes?.item(Math.min(place, removes.length - 1)) ??
      root.current;
    fallback?.focus();
  });
  // The link a reader was on as scripts took over, by the control it names:
  // the button that replaces it takes that focus, or the reader who tabbed
  // to it before hydration is left on nothing.
  const handedFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!hydrated) {
      handedFocus.current =
        root.current
          ?.querySelector("a[data-control]:focus")
          ?.getAttribute("data-control") ?? null;
      return;
    }
    const control = handedFocus.current;
    if (control === null) {
      return;
    }
    handedFocus.current = null;
    // Matched by value, not a selector built from a field name.
    root.current
      ?.querySelectorAll<HTMLElement>("button[data-control]")
      .forEach((button) => {
        if (button.dataset["control"] === control) {
          button.focus();
        }
      });
  }, [hydrated]);
  const trackFocus = {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      focused.current = event.target;
    },
    onBlur: () => {
      focused.current = null;
    },
  };

  // What orders the rows while the reader states no term: the source's own.
  const ordering = provider.capabilities.sort.default;

  return (
    <section
      {...rest}
      ref={attach}
      // The panel itself takes focus only when the last term leaves.
      tabIndex={-1}
      aria-label={label ?? messages.sortPanel}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {sort.length === 0 ? (
        <p>
          {ordering.length === 0
            ? messages.sortAbsent
            : messages.sortDefaulted(
                ordering.map(({ field, direction }) => ({
                  name: field,
                  direction,
                })),
              )}
        </p>
      ) : (
        <ol {...trackFocus}>
          {sort.map((term, at) => {
            const termId = `${baseId}-${term.field}`;
            // Which term, and where, for whichever of its controls has focus.
            const trackTerm = () => {
              focusedTerm.current = { field: term.field, place: at };
            };
            // Each control and the ordering it leads to; none where the
            // term cannot move that way.
            const controls = [
              {
                action: "up",
                text: messages.moveSortTermUp,
                next: at === 0 ? null : moveTerm(sort, term, -1),
              },
              {
                action: "down",
                text: messages.moveSortTermDown,
                next: at === sort.length - 1 ? null : moveTerm(sort, term, 1),
              },
              {
                action: "remove",
                text: messages.removeSortTerm,
                next: sort.filter((other) => other.field !== term.field),
              },
            ] as const;
            return (
              // Keyed by field, so a moved term keeps its controls and the
              // focus on them.
              <li key={term.field}>
                <span id={termId}>{describe(term)}</span>
                {controls.map(({ action, text, next }) => {
                  const control = `${term.field}:${action}`;
                  const removal = action === "remove" ? "remove" : undefined;
                  if (hydrated) {
                    return (
                      <Button
                        key={action}
                        type="button"
                        importance="tertiary"
                        className={removal}
                        data-field={term.field}
                        data-control={control}
                        aria-describedby={termId}
                        onFocus={trackTerm}
                        disabled={next === null}
                        onClick={
                          next === null
                            ? undefined
                            : () => {
                                applyOrdering(next);
                              }
                        }
                      >
                        {text}
                      </Button>
                    );
                  }
                  const destination =
                    next === null ? null : spellOrdering(next);
                  return destination === null ? null : (
                    <a
                      key={action}
                      href={destination}
                      className={removal}
                      data-control={control}
                      aria-describedby={termId}
                    >
                      {text}
                    </a>
                  );
                })}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
