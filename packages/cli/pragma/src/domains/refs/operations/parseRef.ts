/**
 * Package reference parser.
 *
 * Parses pragma.config.json `packages` entries into a discriminated union
 * of resolution strategies: npm (require.resolve), file (local path), or
 * git (cached shallow clone).
 */

import { PragmaError } from "../../../error/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw entry shape accepted in pragma.config.json `packages` array. */
export type RawPackageEntry = string | { readonly name: string; readonly source?: string };

/** Parsed, validated package reference — discriminated by `kind`. */
export type PackageRef =
  | { readonly kind: "npm"; readonly pkg: string }
  | { readonly kind: "file"; readonly pkg: string; readonly path: string }
  | { readonly kind: "git"; readonly pkg: string; readonly url: string; readonly ref: string };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw package entry into a typed PackageRef.
 *
 * @param entry - String (npm package name) or object with optional source.
 * @returns Parsed PackageRef.
 * @throws PragmaError with code CONFIG_ERROR on invalid format.
 */
export function parsePackageEntry(entry: RawPackageEntry): PackageRef {
  if (typeof entry === "string") {
    return { kind: "npm", pkg: entry };
  }

  const { name, source } = entry;

  if (typeof name !== "string" || name.length === 0) {
    throw PragmaError.configError(
      "Package entry must have a non-empty \"name\" field.",
      {
        recovery: {
          message:
            "Each object in the \"packages\" array requires a \"name\" string.",
        },
      },
    );
  }

  if (source === undefined || source === null) {
    return { kind: "npm", pkg: name };
  }

  if (typeof source !== "string") {
    throw PragmaError.configError(
      `Invalid source for "${name}": expected a string.`,
    );
  }

  // file:// — local path override
  if (source.startsWith("file://")) {
    const path = source.slice(7);
    if (path.length === 0) {
      throw PragmaError.configError(
        `Invalid source for "${name}": file:// must be followed by a path.`,
        {
          recovery: {
            message: "Example: file:///home/user/code/my-package",
          },
        },
      );
    }
    return { kind: "file", pkg: name, path };
  }

  // git+<protocol>:// — git ref (https, ssh, file)
  if (source.startsWith("git+")) {
    const hashIdx = source.indexOf("#");
    if (hashIdx === -1 || hashIdx === source.length - 1) {
      throw PragmaError.configError(
        `Invalid source for "${name}": git URL must include a ref after #.`,
        {
          recovery: {
            message:
              "Example: git+https://github.com/org/repo.git#main",
          },
        },
      );
    }
    const url = source.slice(4, hashIdx); // strip "git+" prefix, keep up to #
    const ref = source.slice(hashIdx + 1);
    return { kind: "git", pkg: name, url, ref };
  }

  throw PragmaError.configError(
    `Invalid source for "${name}": "${source}". Expected file://, git+https://, git+ssh://, or git+file://.`,
    {
      recovery: {
        message:
          "Valid formats:\n  file:///absolute/path\n  git+https://host/repo.git#ref\n  git+ssh://git@host/repo.git#ref\n  git+file:///local/bare/repo.git#ref",
      },
    },
  );
}
