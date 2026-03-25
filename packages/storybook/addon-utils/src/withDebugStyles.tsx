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

export const withDebugStyles = (
  StoryFn: StoryFunction<Renderer>,
  context: StoryContext<Renderer>,
) => {
  const [globals] = useGlobals();
  const debugParams = context.parameters?.debug as
    | { baseline?: boolean; outlines?: boolean }
    | undefined;

  const gridMode: GridMode =
    globals[KEY_GRID] ?? (context.parameters?.grid as GridMode) ?? "none";
  const scheme: SchemeMode =
    globals[KEY_SCHEME] ?? (context.parameters?.scheme as SchemeMode) ?? "none";
  const baseline: boolean =
    globals[KEY_BASELINE] ?? debugParams?.baseline ?? false;
  const outlines: boolean =
    globals[KEY_OUTLINES] ?? debugParams?.outlines ?? false;

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
