import type { Decorator } from "@storybook/react-vite";
import type {
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";

export const rtl = () => (Story: ElementType) => (
  <div dir="rtl">
    <Story />
  </div>
);

/**
 * Global decorator: when a story sets `parameters.grid: true`, wrap it in the
 * design system's responsive 12-column `.grid`. Components (or the `surfaces`
 * helper) that should span the whole grid set `grid-column: 1 / -1`.
 *
 * Applied globally in `preview.ts`, so it is a no-op for stories that do not
 * opt in.
 */
export const withGrid: Decorator = (Story, context) =>
  context.parameters?.grid ? (
    <div className="grid responsive">
      <Story />
    </div>
  ) : (
    <Story />
  );

/** Span the full width of the enclosing `.grid` (all columns). */
export const gridSpanAll = { gridColumn: "1 / -1" } as const;

/** The block padding of each surface band (space above/below its component). */
const SURFACE_BAND_PADDING = "5rem";

/**
 * One surface band: a full-width row that paints its own surface background,
 * with its own component centred, then — flush below — the next, deeper band.
 *
 * The three surface levels differ only by *nesting* (`.surface` -> layer 1,
 * `.surface .surface` -> layer 2, `.surface .surface .surface` -> layer 3), so
 * the bands must nest in the DOM to step colour. To keep them reading as three
 * equal, full-width *rows* (not concentric inset boxes), each band pads only on
 * the block axis around its own component, and the nested band sits flush
 * below, spanning the full width — so the padding never compounds and every
 * level shows the same generous band around its component.
 *
 * @param level - this band's surface level (0-based).
 * @param renderAtLevel - the component to place at a given level.
 */
const SurfaceBand = ({
  level,
  renderAtLevel,
}: {
  level: number;
  renderAtLevel: (level: number) => ReactNode;
}): ReactElement => (
  <div
    className="surface"
    style={{
      // Fallback to the base background so the band still paints if the surface
      // channel isn't set (e.g. a Storybook context without the tokens loaded).
      background: "var(--surface-color-background, var(--color-background))",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
    }}
  >
    {/* This band's own component, in an always-`.subgrid` wrapper padded on ALL
        sides so the element is inset from the band edges in every case. When
        the story opts into `parameters.grid`, `.subgrid` passes the page grid's
        column tracks through, so a grid-aware component inside (e.g. an
        Accordion with `grid-column: 1 / -1`) aligns to the page grid. With no
        surrounding grid, `.subgrid` has no tracks to inherit and degrades to a
        plain block — no toggle needed. The padding is on THIS wrapper, not the
        band, so the nested band below stays flush and full-width. */}
    <div className="subgrid" style={{ padding: SURFACE_BAND_PADDING }}>
      {renderAtLevel(level)}
    </div>
    {/* The next, deeper band — flush below, full width (a new equal row). Its
        own element wrapper provides its padding. */}
    {level < 2 ? (
      <SurfaceBand level={level + 1} renderAtLevel={renderAtLevel} />
    ) : null}
  </div>
);

/**
 * Renders `renderAtLevel` inside three stacked, equal-height `.surface` bands
 * (level 1 -> 2 -> 3) so a surface-aware component can be seen at each level.
 * The bands read as three full-width rows of stepping surface colour. A
 * component that provides a surface (e.g. Tile) steps above its band and stands
 * out; one that is not a surface (e.g. Card) blends in. The whole fills the
 * canvas and scrolls.
 *
 * Each band wraps its element in a `.subgrid`: when the story opts into
 * `parameters.grid`, the page grid's columns pass through so a grid-aware
 * component aligns to them; with no grid, `.subgrid` is an inert block. There
 * is no manual toggle — the presence of the grid is what activates it.
 *
 * @param renderAtLevel - returns the node to place at a given level (0-based).
 */
export const surfaces = (
  renderAtLevel: (level: number) => ReactNode,
): ReactElement => (
  // Span the full grid when the story opts into `parameters.grid` (harmless
  // outside a grid), so the surface bands fill the canvas.
  <div style={{ minHeight: "100vh", overflow: "auto", ...gridSpanAll }}>
    <SurfaceBand level={0} renderAtLevel={renderAtLevel} />
  </div>
);

/**
 * Wraps a story in the design system's bare `.grid` preset ("bring your own
 * columns"): the template is supplied via the preset's `--modifier-grid-template`
 * knob, while both row and column gaps resolve from the grid gutter token chain
 * (`--grid-gutter`) instead of ad-hoc literals.
 */
export const grid = () => (Story: ElementType) => (
  <div
    className="grid"
    style={
      {
        "--modifier-grid-template": "repeat(auto-fit, minmax(300px, 1fr))",
      } as CSSProperties
    }
  >
    <Story />
  </div>
);

/**
 * Places the story before a `<main>` element. This is useful for stories that need to be placed before the rest of the page contents in reading order (such as a skip link).
 * @param id - The id of the main element
 * @param children - Content to be rendered inside the main element
 * @TODO this is the first decorator that seems like it may deserve a complex props object, and thus a separate Type.
 *      Should the type be declared separately? Should this be a separate file? Should the decorator be simplified somehow?
 */
export const beforeMain =
  ({ id = "main", children }: { id?: string; children?: ReactNode }) =>
  (Story: ElementType) => (
    <>
      <Story />
      <main id={id} tabIndex={-1}>
        {children}
      </main>
    </>
  );
