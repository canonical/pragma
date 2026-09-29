/*
  The panel's inline size (`--side-panel-inline-size`, 33.5rem), as a viewport
  for the part stories: a part shown on its own wraps exactly as it does in the
  panel, with no wrapper element around it.
*/
const PANEL_WIDTH = 536;

/** Story parameters: the viewport definition, and Chromatic's capture width. */
export const parameters = {
  viewport: {
    options: {
      sidePanel: {
        name: "SidePanel (33.5rem)",
        styles: { width: `${PANEL_WIDTH}px`, height: "100%" },
        type: "desktop",
      },
    },
  },
  chromatic: { viewports: [PANEL_WIDTH] },
};

/** Story globals: open the stories at the panel's width by default. */
export const globals = {
  viewport: { value: "sidePanel", isRotated: false },
};
