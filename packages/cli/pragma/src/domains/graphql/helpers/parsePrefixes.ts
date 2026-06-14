import { PragmaError } from "#error";
import { PREFIX_MAP } from "../../shared/prefixes.js";

/**
 * Parse repeated `--prefix name=namespace` entries into a prefix map.
 *
 * User-supplied prefixes are merged on top of pragma's default
 * {@link PREFIX_MAP}, so `ds:` and the W3C vocabularies stay available
 * unless explicitly overridden.
 *
 * @param entries - Raw `name=namespace` strings from the CLI.
 * @returns The merged prefix map for store creation and compilation.
 * @throws PragmaError with code `INVALID_INPUT` when an entry is malformed.
 */
export default function parsePrefixes(
  entries: readonly string[],
): Record<string, string> {
  const prefixes: Record<string, string> = { ...PREFIX_MAP };

  for (const entry of entries) {
    const separator = entry.indexOf("=");
    const name = separator === -1 ? "" : entry.slice(0, separator).trim();
    const namespace = separator === -1 ? "" : entry.slice(separator + 1).trim();

    if (!name || !namespace) {
      throw PragmaError.invalidInput("prefix", entry, {
        recovery: {
          message:
            "Use name=namespace, e.g. --prefix ds=https://ds.canonical.com/.",
        },
      });
    }

    prefixes[name] = namespace;
  }

  return prefixes;
}
