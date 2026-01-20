/* @canonical/generator-ds 0.9.0-experimental.4 */

import {
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "./common/index.js";
import Toolbar from "./Toolbar.js";

Toolbar.Group = ToolbarGroup;
Toolbar.Button = ToolbarButton;
Toolbar.Separator = ToolbarSeparator;

export * from "./types.js";
export { Toolbar };
