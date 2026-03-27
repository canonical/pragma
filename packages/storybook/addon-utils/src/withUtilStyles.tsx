import { createElement } from "react";
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

  const baseline: boolean = globals[KEY_BASELINE] ?? false;
  const outlines: boolean = globals[KEY_OUTLINES] ?? false;

  useEffect(() => {
    const { classList } = document.body;
    classList.toggle("with-baseline-grid", baseline);
    classList.toggle("with-debug-outlines", outlines);
  }, [baseline, outlines]);

  useEffect(() => {
    const { classList } = document.documentElement;
    classList.toggle("light", scheme === "light");
    classList.toggle("dark", scheme === "dark");
  }, [scheme]);

  if (gridMode !== "none") {
    return createElement("div", { className: `grid ${gridMode}` }, StoryFn());
  }

  return StoryFn();
};
