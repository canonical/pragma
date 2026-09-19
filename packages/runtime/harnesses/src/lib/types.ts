/**
 * Core types for AI harness detection and MCP configuration.
 */

import type { McpEntrySerializer } from "./mcpEntries.js";
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
   *
   * It may return `undefined` for a HOST where this harness keeps no per-user
   * location, which is not the same as a row that declares none: the VS Code
   * rows have one everywhere except under WSL, where the file the Linux side
   * would write is read by nothing. `groupConfigTargets` drops such a row from
   * the global band, so a `both` row falls back to its project file, while a
   * caller that asked for that one file by name gets an error.
   */
  readonly homeConfigPath?: (platform: PlatformEnv) => string | undefined;
  readonly configFormat: "json" | "jsonc" | "toml";
  readonly mcpKey: string;
  readonly skillsPath: (projectRoot: string) => string;
  /**
   * How a server entry is SHAPED in this harness's config — its
   * {@link McpEntrySerializer}. Omitted for harnesses that accept the
   * canonical `{command, args?, cwd?, env?}` shape (`defaultMcpEntry`);
   * declared wherever the harness's own schema demands a different one
   * (OpenCode's `McpLocalConfig`, Cursor's typed stdio entry, …). Both the
   * writer and the read-back classifier consume the resolved serializer, so
   * idempotence holds per shape.
   */
  readonly mcpEntry?: McpEntrySerializer;
  /**
   * Whether this row's per-user config must be EARNED by a user-level match
   * before the global band writes it — see `hasEarnedGlobalBand`.
   *
   * Declared only by the three VS Code products, and only because of the
   * `.vscode/` directory they detect: it is committed to repositories, so on
   * its own it would create a per-user file for every contributor who clones,
   * VS Code installed or not. Every other `both`-scoped row writes its home
   * file on any match, which is the behaviour they have always had — a row
   * detected by a project marker alone is still a row this machine uses.
   */
  readonly requiresUserSignalForGlobal?: boolean;
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
  /**
   * The RESOLVED entry serializer (the harness's `mcpEntry`, defaulted to
   * `defaultMcpEntry`) — always concrete here so read/write bodies never
   * re-consult the harness definition.
   */
  readonly serializeEntry: McpEntrySerializer;
}

/**
 * Result of detecting a harness in the current environment.
 */
export interface DetectedHarness {
  readonly harness: HarnessDefinition;
  readonly confidence: "high" | "medium" | "low";
  readonly configExists: boolean;
  readonly configPath: string;
  /**
   * Whether any signal that matched was a USER-LEVEL one — a configuration
   * directory in the user's home, an installed extension, a binary on `PATH`
   * — rather than something inside the checkout.
   *
   * The confidence tier cannot answer this: "a directory in this repository
   * matched" and "a directory in this user's home matched" both score `high`,
   * and only the second is evidence about the MACHINE. A row that declares
   * `requiresUserSignalForGlobal` needs that distinction before the global
   * band writes its per-user file (see `hasEarnedGlobalBand`).
   */
  readonly matchedUserLevel: boolean;
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
