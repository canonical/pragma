/**
 * Global test setup: isolate the XDG config layer.
 *
 * The layered config reader consults `$XDG_CONFIG_HOME/pragma/config.json`
 * on every read, and global-first writes create it. Point XDG at a
 * per-run temp directory so tests neither observe nor pollute the
 * developer's real global configuration. Individual tests that exercise
 * XDG behavior override this value themselves.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "pragma-test-xdg-"));
