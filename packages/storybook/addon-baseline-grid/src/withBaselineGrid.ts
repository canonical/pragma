import { useEffect, useGlobals } from "storybook/internal/preview-api";
import type {
  Renderer,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";

import { KEY } from "./constants.js";

export const withBaselineGrid = (StoryFn: StoryFunction<Renderer>) => {
  const [globals] = useGlobals();
  const addonGlobals = globals[KEY];

  const utilityClassName = "with-baseline-grid";

  useEffect(() => {
    if (addonGlobals) {
      global.document.body.classList.add(utilityClassName);
    } else {
      global.document.body.classList.remove(utilityClassName);
    }
  }, [addonGlobals]);

  return StoryFn();
};
