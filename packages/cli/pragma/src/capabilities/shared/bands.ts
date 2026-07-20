/**
 * User-facing labels for the two config bands, shared by the setup recap
 * ({@link ../setup/setup.render}) and the doctor report
 * ({@link ../doctor/doctor.render}) so ONE consistent vocabulary appears across
 * both. The pair matches the CLI grammar users already meet elsewhere: the
 * `--global`/`--local` flags, the `--scope project|global|both` enum, config
 * show's `[global]`/`[project]` origin markers, and the `setup` manifest's
 * `[global]`/`[project]` lines. (Earlier these two surfaces said MACHINE/PROJECT
 * — a third term for the same bands; this is the single source that unifies it.)
 */

/** The user-facing display label for each of the two config bands. */
export const BAND_LABELS: Record<"project" | "global", string> = {
  global: "Global",
  project: "Project",
};
