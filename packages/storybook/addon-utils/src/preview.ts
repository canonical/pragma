import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import "@canonical/styles-debug";

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
