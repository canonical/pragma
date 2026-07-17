import type { PackageAnswers, PackageFramework } from "../types.js";

/**
 * `PackageAnswers` as they arrive from the CLI: interactive runs skip the
 * framework prompt entirely for non-library types (its `when` guard), so
 * `framework` may be absent.
 */
export type RawPackageAnswers = Omit<PackageAnswers, "framework"> & {
  framework?: PackageFramework;
};

export interface ResolvedPackageAnswers {
  /** Answers with framework-dependent fields coerced to a consistent state */
  answers: PackageAnswers;
  /** Human-readable messages describing each coercion that was applied */
  warnings: string[];
}

/**
 * Resolve framework-dependent answers to a consistent state.
 *
 * Invalid combinations are coerced (with a warning) rather than rejected:
 * throwing inside `generate()` would crash the CLI ungracefully in batch
 * mode, and prompt-level `validate` cannot see sibling answers.
 *
 * - `framework` applies only to `library` packages; any other type is
 *   coerced back to `"none"`.
 * - Svelte libraries publish `dist/` only and `svelte-package -i src/lib`
 *   never compiles `src/cli.ts`, so `withCli` is coerced off.
 */
export default function resolveFramework(
  raw: RawPackageAnswers,
): ResolvedPackageAnswers {
  const warnings: string[] = [];
  let framework = raw.framework ?? "none";
  let withCli = raw.withCli;

  if (raw.type !== "library" && framework !== "none") {
    warnings.push(
      `framework "${framework}" only applies to library packages; ignoring it for type "${raw.type}"`,
    );
    framework = "none";
  }

  if (framework === "svelte" && withCli) {
    warnings.push(
      "svelte libraries publish dist/ only and cannot ship a src/cli.ts binary; ignoring withCli",
    );
    withCli = false;
  }

  return { answers: { ...raw, framework, withCli }, warnings };
}
