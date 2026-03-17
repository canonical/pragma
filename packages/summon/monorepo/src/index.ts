/**
 * @canonical/summon-monorepo
 *
 * Monorepo generator for Summon - scaffold new Bun + Lerna monorepos
 * with CI, release, and shared configuration.
 */

import type { AnyGenerator } from "@canonical/summon-core";
import { generator as monorepoGenerator } from "./monorepo/index.js";

export const generators: Record<string, AnyGenerator> = {
  monorepo: monorepoGenerator as unknown as AnyGenerator,
};

export default generators;
