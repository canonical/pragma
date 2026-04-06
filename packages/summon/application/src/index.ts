import type { AnyGenerator } from "@canonical/summon-core";
import { generator as applicationReactGenerator } from "./application/react/index.js";
import { generator as routeGenerator } from "./route/index.js";
import { generator as wrapperGenerator } from "./wrapper/index.js";

export const generators = {
  "application/react": applicationReactGenerator,
  route: routeGenerator,
  wrapper: wrapperGenerator,
} as const satisfies Record<string, AnyGenerator>;

export default generators;
