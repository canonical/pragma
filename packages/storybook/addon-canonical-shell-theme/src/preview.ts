import type { ProjectAnnotations, Renderer } from "storybook/internal/types";

import { ADDON_ID } from "./constants.js";

const preview: ProjectAnnotations<Renderer> = {
  decorators: [],
  initialGlobals: {
    [ADDON_ID]: true,
  },
};

export default preview;
