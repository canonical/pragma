import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import "@canonical/styles-debug";

import {
  KEY_BASELINE,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
} from "./constants.js";
import { withDebugStyles } from "./withDebugStyles.js";

const preview: ProjectAnnotations<Renderer> = {
  decorators: [withDebugStyles],
  initialGlobals: {
    [KEY_GRID]: undefined,
    [KEY_SCHEME]: undefined,
    [KEY_BASELINE]: undefined,
    [KEY_OUTLINES]: undefined,
  },
};

export default preview;
