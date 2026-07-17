/**
 * Global test setup: isolate the XDG config, data, and state layers.
 *
 * The layered config reader consults `$XDG_CONFIG_HOME/pragma/config.json`
 * on every read, global-first writes create it, and the project-config
 * evaluator caches compiled configs under `$XDG_STATE_HOME`. Point all three
 * at per-run temp directories so tests neither observe nor pollute the
 * developer's real global state. Individual tests that exercise XDG
 * behaviour override these values themselves.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma2-test-xdg-"));
process.env.XDG_DATA_HOME = mkdtempSync(
  join(tmpdir(), "pragma2-test-xdg-data-"),
);
process.env.XDG_STATE_HOME = mkdtempSync(
  join(tmpdir(), "pragma2-test-xdg-state-"),
);
