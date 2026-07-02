import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import "@canonical/styles/fonts";
import "@canonical/styles-debug";
// Force autodocs pages to render in the light scheme (see forceLightDocs.ts).
import "./forceLightDocs.js";

import {
  KEY_BASELINE,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
} from "./constants.js";
import { withUtilStyles } from "./withUtilStyles.js";

const preview: ProjectAnnotations<Renderer> = {
  decorators: [withUtilStyles],
  initialGlobals: {
    [KEY_GRID]: undefined,
    [KEY_SCHEME]: undefined,
    [KEY_BASELINE]: false,
    [KEY_OUTLINES]: false,
  },
};

export default preview;
