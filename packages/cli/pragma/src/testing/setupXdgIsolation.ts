/**
 * Global test setup: isolate the XDG config and data layers.
 *
 * The layered config reader consults `$XDG_CONFIG_HOME/pragma/config.json`
 * on every read, and global-first writes create it; the schema artifact
 * writes to `$XDG_DATA_HOME/pragma/schema.graphql`. Point both at
 * per-run temp directories so tests neither observe nor pollute the
 * developer's real global state. Individual tests that exercise XDG
 * behavior override these values themselves.
 *
 * The boot-time schema artifact emission is disabled globally: it would
 * add a full ke-graphql compile to every test that drives the real CLI
 * pipeline and print an "Updated ..." notice on first boot. Its behavior
 * is covered directly by ensureSchemaArtifact.test.ts; tests exercising
 * the boot hook re-enable it explicitly.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma-test-xdg-"));
process.env.XDG_DATA_HOME = mkdtempSync(
  join(tmpdir(), "pragma-test-xdg-data-"),
);
process.env.PRAGMA_SCHEMA_ARTIFACT = "off";
