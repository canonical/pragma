/**
 * @canonical/summon-package
 *
 * Package generator for Summon - scaffold new npm packages with proper configuration.
 */

import type { AnyGenerator } from "@canonical/summon-core";
import { generator as packageGenerator } from "./package/index.js";

export const generators = {
  package: packageGenerator,
} as const satisfies Record<string, AnyGenerator>;

export default generators;
