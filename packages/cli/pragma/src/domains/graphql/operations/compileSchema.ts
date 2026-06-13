import { readFileSync } from "node:fs";
import { createStore } from "@canonical/ke";
import {
  CompilationError,
  type CompilerResult,
  compile,
  type Diagnostic,
  hashSources,
  createStoreQueryFn,
} from "@canonical/ke-graphql";
import { PragmaError } from "#error";
import { resolveSourceFiles } from "../helpers/index.js";

export interface CompileSchemaOptions {
  /** TTL file paths or glob patterns, resolved from `cwd`. */
  readonly sources: readonly string[];
  /** Prefix map handed to both the ke store and the compiler. */
  readonly prefixes: Readonly<Record<string, string>>;
  /** Working directory for resolving relative source paths. */
  readonly cwd: string;
}

export interface CompileSchemaResult {
  /** `"ok"` when a schema was produced, `"failed"` when composition aborted. */
  readonly status: "ok" | "failed";
  /** All compiler diagnostics, including those carried by a CompilationError. */
  readonly diagnostics: readonly Diagnostic[];
  /** Resolved absolute TTL file paths that were loaded. */
  readonly files: readonly string[];
  /** Fingerprint of the raw source contents (matches ke's onLoad hashing). */
  readonly sourcesHash: string;
  /** Full compiler output; absent when compilation failed. */
  readonly compiled?: CompilerResult;
}

/**
 * Compile TTL sources into a GraphQL schema via the ke-graphql pipeline.
 *
 * Resolves source patterns, hashes the raw file contents (the exact bytes
 * ke loads, so the artifact's `sourcesHash` matches what
 * `createSchemaPlugin` computes from ke's onLoad), boots a throwaway ke
 * store, and runs the compiler. A {@link CompilationError} (schema
 * composition failed) is converted into a `"failed"` result carrying its
 * diagnostics; the store is always disposed.
 *
 * @note Impure — reads filesystem and boots a ke store (WASM + TTL).
 *
 * @param options - Sources, prefixes, and working directory.
 * @returns The compile outcome with diagnostics, files, and sources hash.
 * @throws PragmaError with code `INVALID_INPUT` when no sources resolve.
 * @throws PragmaError with code `STORE_ERROR` when the store fails to load.
 */
export default async function compileSchema(
  options: CompileSchemaOptions,
): Promise<CompileSchemaResult> {
  const files = resolveSourceFiles(options.sources, options.cwd);

  if (files.length === 0) {
    throw PragmaError.invalidInput("sources", options.sources.join(", "), {
      recovery: {
        message: "Provide at least one existing TTL file or glob pattern.",
      },
    });
  }

  const contents = files.map((file) => readFileSync(file, "utf-8"));
  const sourcesHash = hashSources(contents);

  let store: Awaited<ReturnType<typeof createStore>>;
  try {
    store = await createStore({
      sources: [...files],
      prefixes: options.prefixes,
      cwd: options.cwd,
    });
  } catch (error) {
    throw PragmaError.storeError(
      error instanceof Error ? error.message : String(error),
      {
        recovery: {
          message: "Check the TTL syntax of the provided sources.",
        },
      },
    );
  }

  try {
    const compiled = await compile(createStoreQueryFn(store), options.prefixes);
    return {
      status: "ok",
      diagnostics: compiled.diagnostics,
      files,
      sourcesHash,
      compiled,
    };
  } catch (error) {
    if (error instanceof CompilationError) {
      return {
        status: "failed",
        diagnostics: error.diagnostics,
        files,
        sourcesHash,
      };
    }
    throw error;
  } finally {
    store.dispose();
  }
}
