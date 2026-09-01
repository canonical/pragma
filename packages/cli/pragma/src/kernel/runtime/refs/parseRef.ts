/**
 * Parse a config `packs` declaration into a typed {@link PackageRef}.
 *
 * Ported from the v1 refs domain. Three resolution strategies, discriminated by
 * `kind`: `npm` (a bare package name, resolved via `require.resolve`), `file`
 * (a `file://` local path override), and `git` (a `git+<proto>://…#ref` shallow
 * clone). The `source` string is kept verbatim so `sources status` reports
 * exactly what the config declared.
 */

import type { PackDeclaration } from "../../config/index.js";
import { PragmaError } from "../../error/index.js";

/** A parsed, validated package reference — discriminated by `kind`. */
export type PackageRef =
  | { readonly kind: "npm"; readonly pkg: string; readonly source: string }
  | {
      readonly kind: "file";
      readonly pkg: string;
      readonly path: string;
      readonly source: string;
    }
  | {
      readonly kind: "git";
      readonly pkg: string;
      readonly url: string;
      readonly ref: string;
      /** Package root WITHIN the clone, for a package nested in a monorepo. */
      readonly subdir?: string;
      readonly source: string;
    };

/**
 * Parse a config `packs` declaration into a {@link PackageRef}.
 *
 * @param entry - A bare npm name, or a `{ name, source }` declaration.
 * @returns The parsed reference (with the verbatim `source`).
 * @throws PragmaError CONFIG_ERROR on an invalid `source`.
 */
export function parsePackDeclaration(entry: PackDeclaration): PackageRef {
  if (typeof entry === "string") {
    return { kind: "npm", pkg: entry, source: entry };
  }

  const { name, source } = entry;
  if (typeof name !== "string" || name.length === 0) {
    throw PragmaError.configError(
      'Pack declaration must have a non-empty "name".',
    );
  }
  if (source === undefined) {
    return { kind: "npm", pkg: name, source: name };
  }

  if (source.startsWith("file://")) {
    const path = source.slice("file://".length);
    if (path.length === 0) {
      throw PragmaError.configError(
        `Invalid source for "${name}": file:// must be followed by a path.`,
      );
    }
    return { kind: "file", pkg: name, path, source };
  }

  if (source.startsWith("git+")) {
    const hashIdx = source.indexOf("#");
    if (hashIdx === -1 || hashIdx === source.length - 1) {
      throw PragmaError.configError(
        `Invalid source for "${name}": git URL must include a ref after #.`,
        {
          recovery: {
            message: "Example: git+https://github.com/org/repo.git#main",
          },
        },
      );
    }
    // `#<ref>` or `#<ref>:<subdir>`. A git ref cannot contain a colon
    // (git check-ref-format), so the split is unambiguous.
    const fragment = source.slice(hashIdx + 1);
    const colonIdx = fragment.indexOf(":");
    if (colonIdx !== -1 && colonIdx === fragment.length - 1) {
      throw PragmaError.configError(
        `Invalid source for "${name}": the subdirectory after : is empty.`,
        {
          recovery: {
            message:
              "Example: git+https://github.com/org/repo.git#main:packages/thing",
          },
        },
      );
    }
    const ref = colonIdx === -1 ? fragment : fragment.slice(0, colonIdx);
    if (ref.length === 0) {
      throw PragmaError.configError(
        `Invalid source for "${name}": git URL must include a ref after #.`,
      );
    }
    return {
      kind: "git",
      pkg: name,
      url: source.slice("git+".length, hashIdx),
      ref,
      ...(colonIdx === -1 ? {} : { subdir: fragment.slice(colonIdx + 1) }),
      source,
    };
  }

  throw PragmaError.configError(
    `Invalid source for "${name}": "${source}". Expected file://, git+https://, git+ssh://, or git+file://.`,
  );
}

/**
 * Strip any userinfo (`user:pass@` / `token@`) from a URL for display.
 *
 * A git source can inline credentials (`git+https://user:TOKEN@host/…`); those
 * must never reach progress or error output, which lands in stderr logs and —
 * via `toolError` — MCP-agent-visible responses. Applied only where a URL is
 * interpolated for a human/agent; `PackageRef.url` keeps the credential verbatim
 * so git can still authenticate.
 *
 * @param url - A URL that may carry userinfo before the host.
 * @returns The URL with any leading `userinfo@` replaced by `***@`.
 */
export function redactUrl(url: string): string {
  return url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/@]+@/, "$1***@");
}
