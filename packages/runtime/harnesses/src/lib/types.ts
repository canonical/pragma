/**
 * Core types for AI harness detection and MCP configuration.
 */

import type { PlatformEnv } from "./platformPaths.js";

/**
 * A signal used to detect whether a harness is present in the environment.
 */
export type DetectionSignal =
  | { readonly type: "directory"; readonly path: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "extension"; readonly id: string }
  | {
      readonly type: "process";
      readonly name: string;
      /**
       * When present, a bare PATH hit is not enough: the binary is run with
       * `args` and its stdout must match `match` (guards against a same-named
       * binary belonging to a different tool).
       */
      readonly verify?: {
        readonly args: readonly string[];
        readonly match: RegExp;
      };
    }
  | { readonly type: "env"; readonly key: string; readonly value?: string };

/**
 * A semver range string (e.g. ">=1.5.0", "*") used to match harness versions.
 * "*" matches any version.
 */
export type VersionRange = string;

/**
 * Where a harness stores its MCP config: `project` writes only a per-repo file,
 * `global` writes only the user's home config, `both` can write either band
 * (defaulting to the project file — see `defaultBandOf`).
 */
export type HarnessScope = "project" | "global" | "both";

/**
 * One of the two config bands a scope resolves to: the per-repo `project` file
 * or the per-user `global` (home) file.
 */
export type ScopeBand = "project" | "global";

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
  /** Which config band(s) this harness supports. */
  readonly scope: HarnessScope;
  readonly detect: readonly DetectionSignal[];
  readonly configPath: (projectRoot: string) => string;
  /**
   * The per-user (home) config path. Required for `global`/`both` scopes —
   * `resolveConfigTarget` asserts its presence when a global-band target is
   * requested — and omitted for `project`-only harnesses.
   */
  readonly homeConfigPath?: (platform: PlatformEnv) => string;
  readonly configFormat: "json" | "jsonc" | "toml";
  readonly mcpKey: string;
  readonly skillsPath: (projectRoot: string) => string;
  /**
   * When true, a written server entry's `env` is forced to a JSON object/map
   * (OpenDesign requires it — see VERIFY(7g)). Omitted (falsy) for harnesses
   * that leave `env` as authored.
   */
  readonly normalizeEnv?: boolean;
}

/**
 * A resolved, band-specific config location — the concrete file a read/write
 * acts on, produced by `resolveConfigTarget`. Carries everything the JSON/TOML
 * bodies need without re-consulting the harness definition.
 */
export interface ConfigTarget {
  readonly path: string;
  readonly configFormat: "json" | "jsonc" | "toml";
  readonly mcpKey: string;
  readonly scope: HarnessScope;
  /** Force a written entry's `env` to a JSON object/map (OpenDesign — 7g). */
  readonly normalizeEnv?: boolean;
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
