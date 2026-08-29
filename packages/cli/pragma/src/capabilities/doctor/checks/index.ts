/**
 * The doctor check catalogue — the diagnoses `doctor` composes into a report.
 *
 * A check is the whole shape of this domain: it inspects ONE thing, decides
 * pass or fail, and hands back a `CheckResult` carrying the remedy. Keeping
 * them apart from the report body is what lets `runChecks` stay a composition
 * — it orders and awaits, and knows nothing about what any check looks at.
 *
 * Two kinds live here, and the barrel exposes them differently. The UNBANDED
 * checks diagnose what `setup` cannot install — the Node floor, the CLI's own
 * version and install source, the pack answering this project's reads, and the
 * store — so each is its own named entry point. The SCOPED rows are derived
 * per target, per scope, from the setup target table rather than authored here,
 * so they surface as the one generator that derives them, never as a list of
 * row names this file would then have to keep in step with `setup`.
 *
 * The per-target probes (the completions script check, the MCP command
 * resolution helpers) stay internal on purpose: `scopedChecks` is the only way
 * they are meant to be reached, and a row reachable past its scope is a row
 * `doctor` can report and `setup` cannot fix.
 */

export { checkKeStore } from "./checkKeStore.js";
export { checkNodeVersion } from "./checkNodeVersion.js";
export { checkPackageRefs } from "./checkPackageRefs.js";
export { checkPragmaVersion } from "./checkPragmaVersion.js";
export { scopedChecks } from "./targetHealth.js";
