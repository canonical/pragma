import type { ExampleComponent } from "./types.js";

export * from "./types.js";
export * from "./utils/index.js";

import { Provider } from "./Provider/index.js";
import { Controls } from "./common/Controls/index.js";
import { Renderer } from "./common/Renderer/index.js";
export const Example = Provider as ExampleComponent;
Example.Controls = Controls;
Example.Renderer = Renderer;
