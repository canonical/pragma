/**
 * Core types for AI harness detection and MCP configuration.
 */

/**
 * A signal used to detect whether a harness is present in the environment.
 */
export type DetectionSignal =
  | { readonly type: "directory"; readonly path: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "extension"; readonly id: string }
  | { readonly type: "process"; readonly name: string }
  | { readonly type: "env"; readonly key: string; readonly value?: string };

/**
 * A semver range string (e.g. ">=1.5.0", "*") used to match harness versions.
 * "*" matches any version.
 */
export type VersionRange = string;

/**
 * Definition of an AI harness (editor/agent) with its detection signals,
 * configuration format, and known paths.
 *
 * Multiple entries may exist for the same harness ID with different version
 * ranges, allowing config format changes across versions.
 */
export interface HarnessDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: VersionRange;
  readonly detect: readonly DetectionSignal[];
  readonly configPath: (projectRoot: string) => string;
  readonly configFormat: "json" | "jsonc" | "toml";
  readonly mcpKey: string;
  readonly skillsPath: (projectRoot: string) => string;
}

/**
 * Result of detecting a harness in the current environment.
 */
export interface DetectedHarness {
  readonly harness: HarnessDefinition;
  readonly confidence: "high" | "medium" | "low";
  readonly configExists: boolean;
  readonly configPath: string;
}

/**
 * Configuration for an MCP server entry within a harness config file.
 */
export interface McpServerConfig {
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}
