import type { ExampleComponent } from "./types.js";

export type * from "./types.js";

import { Controls } from "./common/Controls/index.js";
import { Renderer } from "./common/Renderer/index.js";
import Provider from "./Provider.js";
export const Example = Provider as ExampleComponent;
Example.Controls = Controls;
Example.Renderer = Renderer;
