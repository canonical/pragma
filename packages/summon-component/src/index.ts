/**
 * @canonical/summon-component
 *
 * Component generators for Summon.
 */

import type { AnyGenerator } from "@canonical/summon";
import { generator as reactGenerator } from "./react/index.js";
import { generator as svelteGenerator } from "./svelte/index.js";

export const generators: Record<string, AnyGenerator> = {
  "component/react": reactGenerator as unknown as AnyGenerator,
  "component/svelte": svelteGenerator as unknown as AnyGenerator,
};

export default generators;
