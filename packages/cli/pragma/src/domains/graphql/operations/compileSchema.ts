import { createStore, type InlineSource } from "@canonical/ke";
import {
  CompilationError,
  type CompilerResult,
  compile,
  createStoreQueryFn,
  type Diagnostic,
  hashSources,
} from "@canonical/ke-graphql";
import { PragmaError } from "#error";

export interface CompileSchemaOptions {
  /** In-memory TTL sources (content + provenance path) to compile. */
  readonly sources: readonly InlineSource[];
  /** Prefix map handed to both the ke store and the compiler. */
  readonly prefixes: Readonly<Record<string, string>>;
  /** Working directory, passed through to the store (unused for inline). */
  readonly cwd?: string;
}

export interface CompileSchemaResult {
  /** `"ok"` when a schema was produced, `"failed"` when composition aborted. */
  readonly status: "ok" | "failed";
  /** All compiler diagnostics, including those carried by a CompilationError. */
  readonly diagnostics: readonly Diagnostic[];
  /** Provenance paths of the sources that were loaded. */
  readonly files: readonly string[];
  /** Fingerprint of the raw source contents (matches ke's onLoad hashing). */
  readonly sourcesHash: string;
  /** Full compiler output; absent when compilation failed. */
  readonly compiled?: CompilerResult;
}

/**
 * Compile in-memory TTL sources into a GraphQL schema via the ke-graphql
 * pipeline.
 *
 * Hashes the raw source contents (the exact bytes ke loads, so the
 * artifact's `sourcesHash` matches what `createSchemaPlugin` computes from
 * ke's onLoad), boots a throwaway ke store, and runs the compiler. A
 * {@link CompilationError} (schema composition failed) is converted into a
 * `"failed"` result carrying its diagnostics; the store is always disposed.
 *
 * @note Impure — boots a ke store (WASM + TTL).
 *
 * @param options - In-memory sources and prefixes.
 * @returns The compile outcome with diagnostics, files, and sources hash.
 * @throws PragmaError with code `INVALID_INPUT` when given no sources.
 * @throws PragmaError with code `STORE_ERROR` when the store fails to load.
 */
export default async function compileSchema(
  options: CompileSchemaOptions,
): Promise<CompileSchemaResult> {
  const { sources } = options;

  if (sources.length === 0) {
    throw PragmaError.invalidInput("sources", "(empty)", {
      recovery: {
        message: "Provide at least one TTL source.",
      },
    });
  }

  const sourcesHash = hashSources(sources.map((source) => source.content));
  const files = sources.map((source) => source.path ?? "inline");

  let store: Awaited<ReturnType<typeof createStore>>;
  try {
    store = await createStore({
      sources: [...sources],
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
