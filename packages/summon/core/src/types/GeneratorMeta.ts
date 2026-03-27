/**
 * Metadata for a generator, displayed in CLI help and discovery.
 */
export default interface GeneratorMeta {
  /** Generator name, used in CLI path (e.g., "component/react") */
  name: string;
  /**
   * Name used in generated file stamp comments.
   * Use this when the stamp should differ from the CLI command path
   * (e.g., "@canonical/summon-component:react" vs "component/react").
   */
  displayName: string;
  /** One-line description shown in generator listings */
  description: string;
  /** Semantic version of the generator */
  version: string;
  /** Author name or email */
  author?: string;
  /**
   * Extended help text shown when calling `summon <topic>` (without subgenerator)
   * and in --help. Use this for detailed explanation and examples.
   * Supports markdown-like formatting.
   */
  help?: string;
  /**
   * Usage examples shown in help. Each example should show a common invocation.
   */
  examples?: string[];
}
