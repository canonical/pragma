import { useEffect, useGlobals } from "storybook/internal/preview-api";
import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import {
  type GridMode,
  KEY_BASELINE,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
  type SchemeMode,
} from "./constants.js";

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

  useEffect(() => {
    const root = document.getElementById("storybook-root");
    if (!root) return;
    root.classList.toggle("with-baseline-grid", baseline);
    root.classList.toggle("with-debug-outlines", outlines);
  }, [baseline, outlines]);

  useEffect(() => {
    const root = document.getElementById("storybook-root");
    if (!root) return;
    // Remove previous grid mode classes
    root.classList.remove("grid", "responsive", "intrinsic");
    if (gridMode !== "none") {
      root.classList.add("grid", gridMode);
      // The story root fills the preview height, so a grid there would stretch
      // its (single) row and the story looks vertically centred. Top-align so
      // rows take their natural height instead.
      root.style.alignContent = "start";
    } else {
      root.style.removeProperty("align-content");
    }
  }, [gridMode]);

  useEffect(() => {
    const { classList } = document.documentElement;
    classList.toggle("light", scheme === "light");
    classList.toggle("dark", scheme === "dark");
  }, [scheme]);

  return StoryFn();
};
