import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import "@canonical/styles/fonts";
import "@canonical/styles-debug";
// Force autodocs pages to render in the light scheme (see forceLightDocs.ts).
import "./forceLightDocs.js";

import {
  KEY_BASELINE,
  KEY_CONTEXT,
  KEY_DENSITY,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
} from "./constants.js";
import { withUtilStyles } from "./withUtilStyles.js";

const preview: ProjectAnnotations<Renderer> = {
  decorators: [withUtilStyles],
  initialGlobals: {
    // All undefined so `withUtilStyles` falls back to each story's parameters
    // (e.g. `parameters: { baseline: true }`), then to the resolver's own default,
    // until the user picks in the toolbar. Density/context are undefined here too
    // (like grid/scheme): a control ALWAYS has a density, but that default lives in
    // withUtilStyles (fallback to DEFAULT_DENSITY / DEFAULT_CONTEXT), so a story can
    // still set `parameters: { density, context }` and have it take effect.
    [KEY_GRID]: undefined,
    [KEY_SCHEME]: undefined,
    [KEY_BASELINE]: undefined,
    [KEY_OUTLINES]: undefined,
    [KEY_DENSITY]: undefined,
    [KEY_CONTEXT]: undefined,
  },
};

export default preview;
