/**
 * Built-in configuration defaults — the validated distribution config.
 *
 * The lowest config layer is the distribution's own `pragma.conf.ts` (package
 * root), STATICALLY imported so `bun build --compile` inlines it (no fs read —
 * `evaluateProjectConfig` stats/imports from disk, impossible inside the
 * compiled binary) and validated through the same `parseRawConfig` as every
 * other layer. Statically imported by `readConfig` (itself dynamic-imported,
 * off the `--help`/`__complete` fast path) and by its own test, so the eager
 * validation and the zod import here add nothing to the storeless surfaces —
 * the lazy.test.ts module-graph probe covers that boundary.
 */

import rawConfig from "../../../pragma.conf.js";
import { parseRawConfig } from "./schema.js";

export default parseRawConfig(rawConfig, "pragma.conf.ts");
