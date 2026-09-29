import type { AnyGenerator } from "@canonical/summon-core";
import { generator as applicationReactGenerator } from "./application/react/index.js";
import { generator as domainGenerator } from "./domain/index.js";
import { generator as pageGenerator } from "./page/index.js";
import { generator as wrapperGenerator } from "./wrapper/index.js";

export const generators = {
  "application/react": applicationReactGenerator,
  domain: domainGenerator,
  page: pageGenerator,
  wrapper: wrapperGenerator,
} as const satisfies Record<string, AnyGenerator>;

export default generators;
