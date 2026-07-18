/**
 * The `doctor` verb spec (noun `doctor`, self-verb).
 *
 * A read (`mutates: false`) that declares `needsStore: false` — the covenant has
 * neither flag — so the dispatcher never pre-boots the store. The one store
 * check boots it lazily inside a try/catch, keeping doctor storeless-by-default
 * while still reporting store health. `run` lazily imports the orchestrator, so
 * building the tree pulls neither the checks nor `@canonical/harnesses`.
 *
 * Exit-code decision: doctor always exits 0 — failures live in the `{ failed }`
 * envelope (agents read the data; CI greps it). See PARITY_GAP
 * `doctor-exit-zero-with-failures`.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { doctorFormatters } from "./doctor.render.js";
import type { DoctorData } from "./types.js";

const doctorVerb: VerbSpec<Record<string, unknown>, DoctorData> = {
  path: ["doctor"],
  summary: "Check environment health — Node, config, store, MCP, and skills.",
  doc: "Runs nine diagnostic checks and reports pass/fail/skip with inline remedies. Storeless by default; the store check boots lazily and never fails the run.",
  params: [],
  output: { formatters: doctorFormatters },
  examples: [
    { cmd: "pragma doctor" },
    { cmd: "pragma doctor --format json", note: "machine-readable checks" },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (_params, runtime) =>
    import("./runChecks.js").then((m) => m.runChecks(runtime)),
};

/** The `doctor` capability module. */
export const doctorModule: CapabilityModule = {
  name: "doctor",
  verbs: [asVerb(doctorVerb)],
};
