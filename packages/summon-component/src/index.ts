/**
 * @canonical/summon-component
 *
 * Component generators for Summon CLI.
 *
 * This package provides generators for creating React and Svelte components
 * with TypeScript, tests, stories, and styles.
 *
 * @example
 * ```bash
 * # Generate a React component
 * summon component react --component-path=src/components/Button
 *
 * # Generate a Svelte component
 * summon component svelte --component-path=src/lib/components/Button
 * ```
 *
 * @packageDocumentation
 */

import type { AnyGenerator } from "@canonical/summon";
import { generator as reactGenerator } from "./react/index.js";
import { generator as svelteGenerator } from "./svelte/index.js";

/**
 * Registry of all component generators.
 *
 * Keys are command paths (e.g., "component/react") that map to the CLI command structure.
 * Values are generator definitions that can be executed by Summon.
 */
export const generators = {
  "component/react": reactGenerator,
  "component/svelte": svelteGenerator,
} as const satisfies Record<string, AnyGenerator>;

export default generators;
