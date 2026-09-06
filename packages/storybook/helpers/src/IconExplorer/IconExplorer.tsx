import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createIconIndex } from "./search.js";
import type {
  IconExplorerMetadata,
  IconExplorerProps,
  IconSearchResult,
} from "./types.js";

import "./IconExplorer.css";

const componentCssClassName = "icon-explorer";

const MIN_SIZE = 16;
const MAX_SIZE = 48;
const RELATED_LIMIT = 5;
const NEAREST_LIMIT = 5;

/**
 * How many cells fit on a row, read back from the rendered layout.
 *
 * Exported so it can be tested directly: jsdom reports `offsetTop` as 0 for
 * every element, so a test driving the real grid cannot tell a row move from a
 * jump to the end.
 */
export function measureColumns(grid: HTMLElement | null): number {
  const cells = grid?.children;
  if (!cells || cells.length === 0) return 1;

  const firstTop = (cells[0] as HTMLElement).offsetTop;
  let columns = 0;
  while (
    columns < cells.length &&
    (cells[columns] as HTMLElement).offsetTop === firstTop
  ) {
    columns += 1;
  }
  return Math.max(columns, 1);
}

/** Icons sharing the most tags with this one, best overlap first. */
function findRelatedIcons<Name extends string>(
  name: Name,
  icons: readonly Name[],
  metadata: Readonly<Record<Name, IconExplorerMetadata>>,
): Name[] {
  const own = new Set(metadata[name]?.tags ?? []);
  if (own.size === 0) return [];

  return icons
    .filter((candidate) => candidate !== name)
    .map((candidate) => ({
      name: candidate,
      shared: (metadata[candidate]?.tags ?? []).filter((tag) => own.has(tag))
        .length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.name.localeCompare(b.name))
    .slice(0, RELATED_LIMIT)
    .map((entry) => entry.name);
}

/** The closest names to a query, for when nothing matched. */
function findNearestNames<Name extends string>(
  query: string,
  icons: readonly Name[],
): Name[] {
  const letters = new Set(query.toLowerCase().replace(/[^a-z]/g, ""));
  return [...icons]
    .map((name) => ({
      name,
      score: [...new Set(name.replace(/[^a-z]/g, ""))].filter((letter) =>
        letters.has(letter),
      ).length,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, NEAREST_LIMIT)
    .map((entry) => entry.name);
}

/** Writes to the clipboard, reporting whether it actually happened. */
async function copyText(text: string): Promise<boolean> {
  const write = navigator?.clipboard?.writeText;
  if (!write) return false;

  try {
    await write.call(navigator.clipboard, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * A searchable, keyboard-navigable gallery of icons for a docs page.
 *
 * Storybook's sidebar search only indexes story names and paths, so it can
 * never find `delete` from "trash". This block owns its own search over the
 * names, aliases, tags and descriptions a design system publishes alongside
 * its icons.
 *
 * @example
 * ```tsx
 * import { ICON_METADATA, ICON_NAMES } from "@canonical/ds-assets";
 * import { IconExplorer } from "@canonical/storybook-helpers";
 * import { Icon } from "./index.js";
 *
 * <IconExplorer
 *   icons={ICON_NAMES}
 *   metadata={ICON_METADATA}
 *   renderIcon={(name) => <Icon icon={name} />}
 *   snippet={(name) => `<Icon icon="${name}" />`}
 *   importLine={'import { Icon } from "@canonical/react-ds-global";'}
 * />
 * ```
 */
export function IconExplorer<Name extends string = string>({
  metadata,
  icons,
  renderIcon,
  snippet,
  importLine,
  rootPath = "/icons",
  initialQuery = "",
  title,
  className,
  style,
  ...props
}: IconExplorerProps<Name>) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [size, setSize] = useState(24);
  const [selected, setSelected] = useState<Name | null>(null);
  const [active, setActive] = useState(0);
  const [columns, setColumns] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  // Set when the panel was opened from the keyboard, so focus follows it there.
  const [pendingPanelFocus, setPendingPanelFocus] = useState(false);
  const [rawSvg, setRawSvg] = useState<string | null>(null);

  // `icons` is optional; the metadata keys are the natural default and already
  // carry the order the caller wants.
  const names = useMemo(
    () =>
      icons ??
      (Object.keys(metadata).filter((key) => key in metadata) as Name[]),
    [icons, metadata],
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (copiedTimer.current !== undefined)
        window.clearTimeout(copiedTimer.current);
    },
    [],
  );
  const baseId = useId();

  const index = useMemo(
    () => createIconIndex(names, metadata),
    [names, metadata],
  );

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const name of names)
      for (const value of metadata[name]?.categories ?? []) seen.add(value);
    return [...seen].sort();
  }, [names, metadata]);

  const results = useMemo(() => {
    const found: IconSearchResult<Name>[] = index.search(query);
    return found.filter(({ name }) => {
      const entry = metadata[name];
      if (category && !entry?.categories.includes(category)) return false;
      if (!showDeprecated && entry?.deprecated) return false;
      return true;
    });
  }, [index, query, category, showDeprecated, metadata]);

  // Both of these follow from `results`, so they are computed during render
  // rather than corrected by an effect afterwards — an effect would paint one
  // frame showing an icon the grid no longer offers.
  const visibleSelected =
    selected !== null && results.some((result) => result.name === selected)
      ? selected
      : null;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  // Row length comes from the rendered layout, so arrow keys follow what the
  // reader sees rather than a column count guessed from the icon size.
  // Keyed on whether a grid is on screen: with no results there is no element
  // to observe at mount, and the observer would never attach.
  const hasGrid = results.length > 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: hasGrid is the trigger — it says whether gridRef has an element to observe
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => setColumns(measureColumns(grid)));
    observer.observe(grid);
    return () => observer.disconnect();
  }, [hasGrid]);

  // A size change re-lays out the grid without changing the grid box itself, so
  // the observer above does not fire and the row length must be re-measured.
  // Filtering is deliberately not a trigger: auto-fill resolves the same
  // number of tracks whatever the number of cells, so reading layout back on
  // every keystroke would force a style flush for an answer that cannot move.
  // biome-ignore lint/correctness/useExhaustiveDependencies: size is the trigger, not a value the effect reads
  useEffect(() => {
    setColumns(measureColumns(gridRef.current));
  }, [size]);

  // `/` is the search shortcut people already expect, but only when they are
  // not typing into something else.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The raw file is fetched only for the icon on screen, not for all of them.
  useEffect(() => {
    if (!visibleSelected) {
      setRawSvg(null);
      return;
    }

    let cancelled = false;
    setRawSvg(null);
    fetch(`${rootPath}/${encodeURIComponent(visibleSelected)}.svg`)
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => {
        if (!cancelled) setRawSvg(text);
      })
      .catch(() => {
        if (!cancelled) setRawSvg(null);
      });

    return () => {
      cancelled = true;
    };
  }, [visibleSelected, rootPath]);

  const focusCell = (next: number) => {
    setActive(next);
    const cell = gridRef.current?.children[next] as HTMLElement | undefined;
    cell?.focus();
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const last = results.length - 1;
    if (last < 0) return;

    const moves: Record<string, number> = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      ArrowDown: activeIndex + columns,
      ArrowUp: activeIndex - columns,
      Home: 0,
      End: last,
    };

    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault();
      focusCell(Math.min(Math.max(moves[event.key], 0), last));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectByName(results.at(activeIndex)?.name ?? "", true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSelected(null);
    }
  };

  const selectByName = (name: string, moveFocus = false) => {
    const position = results.findIndex((result) => result.name === name);
    if (position === -1) {
      // Reachable from Related and from a deprecation replacement, both of
      // which draw on the whole set. Clear what is hiding it and open it, so
      // the panel is still the destination the reader was promised.
      if (!names.includes(name as Name)) return;
      setQuery("");
      setCategory("");
      setShowDeprecated(true);
      setActive(0);
      setSelected(name as Name);
      if (moveFocus) setPendingPanelFocus(true);
      return;
    }
    setActive(position);
    setSelected(results[position].name);
    if (moveFocus) setPendingPanelFocus(true);
  };

  useEffect(() => {
    if (!pendingPanelFocus) return;
    // Cleared unconditionally: if the panel did not render there is nothing to
    // focus, and leaving the flag set would silently disable it from then on.
    setPendingPanelFocus(false);
    detailRef.current?.focus();
  }, [pendingPanelFocus]);

  // Announced on a delay: the count changes on every keystroke, and a live
  // region that fires per character floods the queue with partial results.
  const [announced, setAnnounced] = useState(
    () => `${names.length} of ${names.length} icons`,
  );
  useEffect(() => {
    const id = window.setTimeout(
      () => setAnnounced(`${results.length} of ${names.length} icons`),
      500,
    );
    return () => window.clearTimeout(id);
  }, [results.length, names.length]);

  // Escape closes the panel from anywhere in the block: the reader is often in
  // the search box, which is where the / shortcut puts them.
  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || visibleSelected === null) return;
    event.preventDefault();
    setSelected(null);
    if (detailRef.current?.contains(document.activeElement))
      focusCell(activeIndex);
  };

  const runCopy = (label: string, text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return;
      setCopied(label);
      if (copiedTimer.current !== undefined)
        window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
    });
  };

  const searchAgain = (term: string) => {
    setQuery(term);
    setCategory("");
    setActive(0);
    searchRef.current?.focus();
  };

  const entry = visibleSelected ? metadata[visibleSelected] : undefined;

  // 165 icons x their tags, so it must not run twice per render.
  const related = useMemo(
    () =>
      visibleSelected ? findRelatedIcons(visibleSelected, names, metadata) : [],
    [visibleSelected, names, metadata],
  );
  const countId = `${baseId}-count`;
  const headingId = `${baseId}-heading`;
  const sizeId = `${baseId}-size`;
  const hasConsumerLabel =
    props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;

  return (
    <section
      {...props}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      // The chosen icon size drives the grid cell width, so it is a custom
      // property on the root rather than a class.
      style={{ ...style, "--icon-explorer-size": `${size}px` } as CSSProperties}
      onKeyDown={onRootKeyDown}
      // A consumer label of either kind is passed straight back through, so the
      // spread above is never clobbered; otherwise the rendered heading names
      // the region, and only a headingless block needs a literal label.
      aria-label={
        props["aria-label"] ??
        (hasConsumerLabel || title ? undefined : "Icon explorer")
      }
      aria-labelledby={
        props["aria-labelledby"] ??
        (title && !props["aria-label"] ? headingId : undefined)
      }
    >
      {title && (
        <h2 className="title" id={headingId}>
          {title}
        </h2>
      )}

      <div className="toolbar">
        <input
          ref={searchRef}
          className="search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          placeholder="Search icons by name, synonym or old name"
          aria-label="Search icons"
          aria-describedby={countId}
        />
        <span className="hint" aria-hidden="true">
          Press / to search
        </span>

        <label>
          Category
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setActive(0);
            }}
          >
            <option value="">All</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={showDeprecated}
            onChange={(event) => setShowDeprecated(event.target.checked)}
          />
          Show deprecated
        </label>

        <label htmlFor={sizeId}>Size</label>
        <input
          id={sizeId}
          type="range"
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={4}
          value={size}
          aria-valuetext={`${size} pixels`}
          onChange={(event) => setSize(Number(event.target.value))}
        />
        <output className="hint" htmlFor={sizeId}>
          {size}px
        </output>
      </div>

      <p className="count" id={countId}>
        {results.length} of {names.length} icons
      </p>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announced}
      </p>

      {/* No scheme control of its own: the block inherits the docs page
          colour scheme, which the shared docs container already follows. */}
      <div className="preview-area">
        {results.length === 0 ? (
          <div className="empty">
            {query.trim() === "" ? (
              <p>No icons match the current filters.</p>
            ) : (
              <>
                <p>
                  Nothing matches <strong>{query}</strong>.
                </p>
                <p>Closest names:</p>
                <ul>
                  {findNearestNames(query, names).map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => searchAgain(name)}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          // Roving tabindex rather than aria-activedescendant: focus really
          // moves to the cell, so the browser scrolls it into view for free.
          <div
            ref={gridRef}
            className="grid"
            role="listbox"
            aria-label="Icons"
            onKeyDown={onGridKeyDown}
          >
            {results.map(({ name, reason }, position) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox container owns keyboard handling for every cell
              <div
                key={name}
                id={`${baseId}-${name}`}
                className="cell"
                role="option"
                aria-selected={name === visibleSelected}
                tabIndex={position === activeIndex ? 0 : -1}
                onClick={() => selectByName(name)}
                onFocus={() => setActive(position)}
              >
                <span className="glyph">{renderIcon(name)}</span>
                <span className="label">{name}</span>
                {reason.kind === "alias" && (
                  <span className="why">was “{reason.term}”</span>
                )}
                {reason.kind === "tag" && (
                  <span className="why">via synonym: {reason.term}</span>
                )}
                {reason.kind === "description" && (
                  <span className="why">matched its description</span>
                )}
              </div>
            ))}
          </div>
        )}

        {visibleSelected && entry && (
          <aside
            ref={detailRef}
            className="detail"
            aria-label={`Details for ${visibleSelected}`}
            tabIndex={-1}
          >
            <div className="preview">{renderIcon(visibleSelected)}</div>

            <h3 className="name">{visibleSelected}</h3>
            {entry.description && (
              <p className="description">{entry.description}</p>
            )}

            {entry.deprecated && (
              <p className="deprecated">
                Deprecated
                {entry.deprecated.since && ` since ${entry.deprecated.since}`}.
                {entry.deprecated.replacedBy && (
                  <>
                    {" "}
                    Use{" "}
                    <button
                      type="button"
                      className="chip"
                      onClick={() =>
                        selectByName(entry.deprecated?.replacedBy ?? "")
                      }
                    >
                      {entry.deprecated.replacedBy}
                    </button>{" "}
                    instead.
                  </>
                )}
              </p>
            )}

            <div className="field">
              <span className="label">Snippet</span>
              <code>{snippet(visibleSelected)}</code>
              <div className="actions">
                <button
                  type="button"
                  className="action"
                  onClick={() => runCopy("snippet", snippet(visibleSelected))}
                >
                  {copied === "snippet" ? "Copied" : "Copy snippet"}
                </button>
              </div>
            </div>

            {importLine && (
              <div className="field">
                <span className="label">Import</span>
                <code>{importLine}</code>
                <div className="actions">
                  <button
                    type="button"
                    className="action"
                    onClick={() => runCopy("import", importLine)}
                  >
                    {copied === "import" ? "Copied" : "Copy import"}
                  </button>
                </div>
              </div>
            )}

            <div className="actions">
              <button
                type="button"
                className="action"
                disabled={!rawSvg}
                onClick={() => rawSvg && runCopy("svg", rawSvg)}
              >
                {copied === "svg" ? "Copied" : "Copy SVG"}
              </button>
              <a
                className="action"
                href={`${rootPath}/${encodeURIComponent(visibleSelected)}.svg`}
                download
              >
                Download SVG
              </a>
            </div>

            <div className="field">
              <span className="label">Categories</span>
              <div className="chips">
                {entry.categories.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    onClick={() => {
                      setCategory(value);
                      setActive(0);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {entry.aliases && entry.aliases.length > 0 && (
              <div className="field">
                <span className="label">Also known as</span>
                <div className="chips">
                  {entry.aliases.map((alias) => (
                    <button
                      key={alias}
                      type="button"
                      className="chip"
                      onClick={() => searchAgain(alias)}
                    >
                      {alias}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <span className="label">Tags</span>
              <div className="chips">
                {entry.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="chip"
                    onClick={() => searchAgain(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {related.length > 0 && (
              <div className="field">
                <span className="label">Related</span>
                <div className="related">
                  {related.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="chip icon"
                      onClick={() => selectByName(name)}
                    >
                      {renderIcon(name)}
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

export default IconExplorer;
