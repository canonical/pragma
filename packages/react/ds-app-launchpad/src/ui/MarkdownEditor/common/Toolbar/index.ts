/* @canonical/generator-ds 0.9.0-experimental.4 */
import Toolbar from "./Toolbar.js";
import {
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "./common/index.js";
Toolbar.Group = ToolbarGroup;
Toolbar.Button = ToolbarButton;
Toolbar.Separator = ToolbarSeparator;

export * from "./types.js";
export { Toolbar };
