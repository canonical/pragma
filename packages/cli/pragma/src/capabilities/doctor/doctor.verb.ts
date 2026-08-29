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
  summary:
    "Check your environment and every setup target, globally and in this project.",
  // Two house rules constrain this string and both are PROTECTED: it may not
  // name the distribution (`identity.test.ts`) and it may not spell a CLI flag
  // (`toolDescriptions.test.ts`), so the inventory's widening is described as
  // "the verbose global flag" rather than by its spelling.
  doc: "Reports the environment checks first, then one row per setup target — once for your home directory, once for this project. Each row is pass, fail, available (an optional integration you have not set up yet), or skip (nothing to do here, and the row says why), with the next step printed inline. Every row is named after the setup target that repairs it, except `harnesses`: a listing, per scope, of the AI harnesses found on this machine and whether this CLI's MCP server is registered in each — the ones actually found, or every harness it knows about under the verbose global flag. Needs no store; the store check boots lazily and never fails the run.",
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
