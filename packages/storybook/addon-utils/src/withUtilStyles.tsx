import { type CSSProperties, createElement } from "react";
import { useEffect, useGlobals } from "storybook/internal/preview-api";
import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import {
  CONTEXT_CLASSES,
  type ContextMode,
  DEFAULT_CONTEXT,
  DEFAULT_DENSITY,
  DENSITY_CLASSES,
  type DensityMode,
  GRID_CLASSES,
  type GridMode,
  KEY_BASELINE,
  KEY_CONTEXT,
  KEY_DENSITY,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
  SCHEME_CLASSES,
  type SchemeMode,
} from "./constants.js";

/**
 * Apply a modifier's class from its class-name map: remove every class the map
 * can produce, then add the one for the active mode (null = add nothing). Keeps
 * the mode→class mapping in constants.ts, not scattered inline.
 */
function applyModifierClass(
  el: HTMLElement,
  classMap: Record<string, string | null>,
  activeMode: string,
): void {
  for (const cls of Object.values(classMap)) {
    if (cls) el.classList.remove(cls);
  }
  const active = classMap[activeMode];
  if (active) el.classList.add(active);
}

export const withUtilStyles = (
  StoryFn: StoryFunction<Renderer>,
  context: StoryContext<Renderer>,
) => {
  const [globals] = useGlobals();

  // undefined = user hasn't touched the dropdown → fall back to story parameters
  // any string (including "none") = user explicitly chose → use it
  const rawGrid = globals[KEY_GRID] as GridMode | undefined;
  const gridMode: GridMode =
    rawGrid !== undefined
      ? rawGrid
      : ((context.parameters?.grid as GridMode) ?? "none");

  const rawScheme = globals[KEY_SCHEME] as SchemeMode | undefined;
  const scheme: SchemeMode =
    rawScheme !== undefined
      ? rawScheme
      : ((context.parameters?.scheme as SchemeMode) ?? "none");

  // undefined = user hasn't touched the toolbar toggle → fall back to the story's
  // parameters so a story can opt into the baseline grid / outlines declaratively
  // (`parameters: { baseline: true }`) without anyone flipping the toolbar. An
  // explicit toolbar choice (true/false) always wins over the parameter.
  const rawBaseline = globals[KEY_BASELINE] as boolean | undefined;
  const baseline: boolean =
    rawBaseline !== undefined
      ? rawBaseline
      : ((context.parameters?.baseline as boolean) ?? false);

  const rawOutlines = globals[KEY_OUTLINES] as boolean | undefined;
  const outlines: boolean =
    rawOutlines !== undefined
      ? rawOutlines
      : ((context.parameters?.outlines as boolean) ?? false);

  const rawDensity = globals[KEY_DENSITY] as DensityMode | undefined;
  const density: DensityMode =
    rawDensity !== undefined
      ? rawDensity
      : ((context.parameters?.density as DensityMode) ?? DEFAULT_DENSITY);

  const rawContext = globals[KEY_CONTEXT] as ContextMode | undefined;
  const surface: ContextMode =
    rawContext !== undefined
      ? rawContext
      : ((context.parameters?.context as ContextMode) ?? DEFAULT_CONTEXT);

  // Story-scoped modifiers are applied to a wrapper element this decorator owns,
  // NOT `#storybook-root`. `#storybook-root` only exists on the single-story
  // canvas — in the autodocs page each story renders in its own container — so
  // targeting a wrapper makes the grid/density/context/overlays work in BOTH
  // views, and avoids stacking with any real `.grid` a story brings itself.
  //
  // Every wrapper-scoped class is computed HERE, at render, and passed to the
  // element — not toggled in a post-paint useEffect. Applying them after the
  // first paint made the story flash its un-gridded layout, then reflow once the
  // grid class landed (e.g. a lone card briefly full-width, then crushed). A
  // render-time className has the grid present on the very first paint.
  const gridClass = gridMode === "none" ? null : GRID_CLASSES[gridMode];
  const wrapperClass = [
    // The "grid" marker turns the preset (`.responsive`/`.intrinsic`) into a real
    // grid box; without a grid the wrapper carries no grid class at all.
    gridMode !== "none" ? "grid" : null,
    gridClass,
    DENSITY_CLASSES[density],
    CONTEXT_CLASSES[surface],
    baseline ? "with-baseline-grid" : null,
    outlines ? "with-debug-outlines" : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Scheme is a page-level concern (light/dark), kept on the document element so
  // it spans the canvas AND the autodocs page (which share one document) — the
  // one modifier that must NOT live on the per-story wrapper.
  useEffect(() => {
    applyModifierClass(document.documentElement, SCHEME_CLASSES, scheme);
  }, [scheme]);

  // The wrapper's own layout, by mode:
  //  - "none":     `display: contents` — carries the classes but generates no box,
  //                so a story that brings its own layout is untouched.
  //  - "showcase": a single clamped column, centred in a tall canvas — for showing
  //                one component off on its own without it stretching to fill the
  //                preview. It IS the (only) grid, so a subgrid child binds to it.
  //                Track width / canvas height / column count are overridable per
  //                story via the CSS vars below.
  //  - other grids: a real `.grid.<preset>`; `align-content: start` keeps rows at
  //                their natural height (the wrapper fills the preview, so a
  //                stretched single row would read as vertically centred).
  let wrapperStyle: CSSProperties;
  if (gridMode === "none") {
    wrapperStyle = { display: "contents" };
  } else if (gridMode === "showcase") {
    wrapperStyle = {
      display: "grid",
      // A single column clamped to --showcase-width (default 22rem), centred.
      gridTemplateColumns: "minmax(0, var(--showcase-width, 22rem))",
      justifyContent: "center",
      // The canvas: a min height so the item sits mid-frame; content at its
      // intrinsic height, vertically centred.
      minBlockSize: "var(--showcase-min-height, 60vh)",
      alignContent: "center",
    };
  } else {
    wrapperStyle = { alignContent: "start" };
  }

  return createElement(
    "div",
    { className: wrapperClass || undefined, style: wrapperStyle },
    StoryFn(),
  );
};
