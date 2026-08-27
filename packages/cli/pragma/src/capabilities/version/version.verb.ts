/**
 * `pragma version` — the command form of `--version`.
 *
 * Users type it reflexively, so it exists and prints exactly the bytes the
 * flag prints: the bare semver on stdout, storeless, no store or network
 * touched. Withheld from MCP — the version already rides `info` and the
 * server handshake's `serverInfo`.
 */

import { BIN_NAME, VERSION } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";

const versionVerb: VerbSpec<Record<string, unknown>, string> = {
  path: ["version"],
  summary: "Print the CLI version.",
  doc: "Prints the version `--version` prints — one value, two spellings of the same read.",
  params: [],
  output: {
    formatters: {
      plain: (version) => version,
      llm: (version) => version,
      json: (version) => JSON.stringify({ version }),
    },
  },
  examples: [{ cmd: `${BIN_NAME} version` }],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: false,
      reason: "the version rides `info` and the MCP handshake's serverInfo",
    },
  },
  run: async () => VERSION,
};

/** The `version` verb. */
export const versionVerbSpec = asVerb(versionVerb);
