/**
 * Fast reference regeneration.
 *
 * Writes `docs/reference/` from the live capability grammar WITHOUT compiling
 * the binary. `scripts/build.ts` runs the same {@link writeReferenceDocs} step
 * before `Bun.build`; this script isolates it so `bun run scripts/genReference.ts`
 * is a sub-second doc refresh. Importing `build.ts` does not trigger a compile —
 * its build block is guarded by `import.meta.main`.
 */

import { writeReferenceDocs } from "./build.js";

const changed = writeReferenceDocs();
console.log(`Wrote ${changed} changed reference page(s) → docs/reference/`);
