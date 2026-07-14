import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import "@canonical/styles/fonts";
import "@canonical/styles-debug";
// Force autodocs pages to render in the light scheme (see forceLightDocs.ts).
import "./forceLightDocs.js";

import {
  DEFAULT_CONTEXT,
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
    // (e.g. `parameters: { baseline: true }`) until the user picks in the toolbar.
    [KEY_GRID]: undefined,
    [KEY_SCHEME]: undefined,
    [KEY_BASELINE]: undefined,
    [KEY_OUTLINES]: undefined,
    [KEY_DENSITY]: undefined,
    // Context defaults to "apps" (the base surface), not undefined.
    [KEY_CONTEXT]: DEFAULT_CONTEXT,
  },
};

export default preview;
