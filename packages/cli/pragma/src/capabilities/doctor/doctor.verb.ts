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

import { BIN_NAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/index.js";
import { doctorFormatters } from "./doctor.render.js";
import type { DoctorData } from "./types.js";

const doctorVerb: VerbSpec<Record<string, unknown>, DoctorData> = {
  path: ["doctor"],
  summary: "Check environment health and every setup target, in both bands.",
  doc: "Reports the environment checks and then one row per setup target in each band, as pass, fail, available (an opt-in integration not yet set up), or skip, with inline remedies. Every banded row is named after the setup target that repairs it. Storeless by default; the store check boots lazily and never fails the run.",
  params: [],
  output: { formatters: doctorFormatters },
  examples: [
    { cmd: `${BIN_NAME} doctor` },
    {
      cmd: `${BIN_NAME} doctor --format json`,
      note: "machine-readable checks",
    },
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
