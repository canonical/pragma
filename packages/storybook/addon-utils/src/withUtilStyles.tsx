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

  useEffect(() => {
    const root = document.getElementById("storybook-root");
    if (!root) return;
    root.classList.toggle("with-baseline-grid", baseline);
    root.classList.toggle("with-debug-outlines", outlines);
  }, [baseline, outlines]);

  useEffect(() => {
    const root = document.getElementById("storybook-root");
    if (!root) return;
    // The grid classes come from GRID_CLASSES; the "grid" marker + align-content
    // are grid-specific extras layered on top.
    applyModifierClass(root, GRID_CLASSES, gridMode);
    if (gridMode !== "none") {
      root.classList.add("grid");
      // The story root fills the preview height, so a grid there would stretch
      // its (single) row and the story looks vertically centred. Top-align so
      // rows take their natural height instead.
      root.style.alignContent = "start";
    } else {
      root.classList.remove("grid");
      root.style.removeProperty("align-content");
    }
  }, [gridMode]);

  useEffect(() => {
    applyModifierClass(document.documentElement, SCHEME_CLASSES, scheme);
  }, [scheme]);

  useEffect(() => {
    // Density on the story root (same node as the grid/baseline overlays).
    const root = document.getElementById("storybook-root");
    if (!root) return;
    applyModifierClass(root, DENSITY_CLASSES, density);
  }, [density]);

  useEffect(() => {
    // Context (surface) on the story root, composes with density.
    const root = document.getElementById("storybook-root");
    if (!root) return;
    applyModifierClass(root, CONTEXT_CLASSES, surface);
  }, [surface]);

  return StoryFn();
};
