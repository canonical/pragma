/**
 * @canonical/summon-package
 *
 * Package generator for Summon - scaffold new npm packages with proper configuration.
 */

import type { AnyGenerator } from "@canonical/summon";
import packageGenerator from "./package/index.js";

export const generators: Record<string, AnyGenerator> = {
  package: packageGenerator as unknown as AnyGenerator,
};
