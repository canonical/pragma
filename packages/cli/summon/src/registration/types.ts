import type { GeneratorDefinition } from "@canonical/summon-core";

/**
 * A flattened representation of a command to register.
 * Separates command discovery from registration.
 */
export interface CommandEntry {
  /** Path segments to this command (e.g., ["component", "react"]) */
  path: string[];
  /** The generator definition if this is a runnable command */
  generator?: GeneratorDefinition;
  /** Description for namespace-only commands */
  description?: string;
}

/**
 * Option metadata built from a prompt definition for Commander.
 */
export interface OptionInfo {
  flags: string;
  description: string;
  defaultValue?: string;
  group?: string;
  /** The original camelCase prompt name */
  promptName: string;
  /** The kebab-case flag name (without --) */
  kebabName: string;
}
