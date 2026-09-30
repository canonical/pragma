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

// Every class this decorator can put on a story container. Each application
// starts by removing all of them, so a container that persists across stories
// (`#storybook-root`) never keeps a previous story's modifiers.
const CONTAINER_CLASSES: readonly string[] = [
  ...Object.values(GRID_CLASSES),
  ...Object.values(DENSITY_CLASSES),
  ...Object.values(CONTEXT_CLASSES),
  "grid",
  "with-baseline-grid",
  "with-debug-outlines",
].filter((cls): cls is string => cls !== null);

// Every inline style property this decorator can set on a story container
// (the showcase layout + grid alignment), removed on each application for the
// same persistence reason as CONTAINER_CLASSES.
const CONTAINER_STYLE_PROPS: readonly string[] = [
  "display",
  "grid-template-columns",
  "justify-content",
  "min-block-size",
  "align-content",
];

/**
 * The DOM elements the current story is being mounted INTO — its direct
 * parent(s), per view mode:
 *
 *  - canvas:   `#storybook-root` (a single mount point for the whole canvas).
 *  - autodocs: `#story--<id>-inner` / `#story--<id>--primary-inner`, the
 *    per-story element the docs page hands to `renderStoryToElement`. The same
 *    story can appear twice on one page (the Primary block and the Stories
 *    list), hence possibly two matches — both get the same state, so applying
 *    to all matches is idempotent.
 */
function storyContainers(context: StoryContext<Renderer>): HTMLElement[] {
  if (typeof document === "undefined") return [];
  if (context.viewMode === "docs") {
    const id = CSS.escape(context.id);
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        `#story--${id}-inner, #story--${id}--primary-inner`,
      ),
    );
  }
  const root = document.getElementById("storybook-root");
  return root ? [root] : [];
}

/**
 * Framework-agnostic story decorator for the utility-styles toolbar.
 *
 * This decorator is registered for EVERY renderer (react, svelte, lit) via
 * `@canonical/storybook-config`, so it must never wrap the story in any
 * framework's element — a React-element wrapper crashes Svelte's decorator
 * handling with "decorator_Component is not a function" (#839). It returns
 * `StoryFn()` untouched and instead mutates the container the renderer mounts
 * the story into (see `storyContainers`).
 *
 * The container is mutated synchronously, at decorate time, which preserves
 * the two properties the previous React-wrapper approach existed for:
 *
 *  - no first-paint flash: the mount container already exists while the
 *    renderer is composing the story, so the grid/density/context classes are
 *    in place before the story's first paint (applying them in a post-paint
 *    `useEffect` made the story flash its un-gridded layout, then reflow);
 *  - subgrid binding: the classes land on the story's DIRECT parent in both
 *    the canvas and the autodocs page, so a story root using
 *    `grid-template-*: subgrid` binds to the decorator's grid in both views.
 */
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

  const gridClass = gridMode === "none" ? null : GRID_CLASSES[gridMode];
  const containerClasses = [
    // The "grid" marker turns the preset (`.responsive`/`.intrinsic`) into a real
    // grid box; without a grid the container carries no grid class at all.
    gridMode !== "none" ? "grid" : null,
    gridClass,
    DENSITY_CLASSES[density],
    CONTEXT_CLASSES[surface],
    baseline ? "with-baseline-grid" : null,
    outlines ? "with-debug-outlines" : null,
  ].filter((cls): cls is string => cls !== null);

  // The container's own layout, by mode:
  //  - "none":     no styles at all — a story that brings its own layout is
  //                untouched.
  //  - "showcase": a single clamped column, centred in a tall canvas — for showing
  //                one component off on its own without it stretching to fill the
  //                preview. It IS the (only) grid, so a subgrid child binds to it.
  //                Track width / canvas height / column count are overridable per
  //                story via the CSS vars below.
  //  - other grids: a real `.grid.<preset>`; `align-content: start` keeps rows at
  //                their natural height (the canvas container fills the preview,
  //                so a stretched single row would read as vertically centred).
  let containerStyles: Record<string, string>;
  if (gridMode === "none") {
    containerStyles = {};
  } else if (gridMode === "showcase") {
    containerStyles = {
      display: "grid",
      // A single column clamped to --showcase-width (default 22rem), centred.
      "grid-template-columns": "minmax(0, var(--showcase-width, 22rem))",
      "justify-content": "center",
      // The canvas: a min height so the item sits mid-frame; content at its
      // intrinsic height, vertically centred.
      "min-block-size": "var(--showcase-min-height, 60vh)",
      "align-content": "center",
    };
  } else {
    containerStyles = { "align-content": "start" };
  }

  for (const el of storyContainers(context)) {
    el.classList.remove(...CONTAINER_CLASSES);
    el.classList.add(...containerClasses);
    for (const prop of CONTAINER_STYLE_PROPS) el.style.removeProperty(prop);
    for (const [prop, value] of Object.entries(containerStyles)) {
      el.style.setProperty(prop, value);
    }
  }

  // Scheme is a page-level concern (light/dark), kept on the document element so
  // it spans the canvas AND the autodocs page (which share one document) — the
  // one modifier that must NOT live on the per-story container.
  useEffect(() => {
    applyModifierClass(document.documentElement, SCHEME_CLASSES, scheme);
  }, [scheme]);

  return StoryFn();
};
