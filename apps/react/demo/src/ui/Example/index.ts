import type { ExampleControlsComponent } from "./types.js";

export * from "./types.js";

import Provider from "./Provider.js";
import { Controls } from "./common/Controls/index.js";
import { Renderer } from "./common/Renderer/index.js";
export const Example = Provider as ExampleControlsComponent;
Example.Controls = Controls;
Example.Renderer = Renderer;
