/**
 * User-facing labels for the two config scopes, shared by the setup recap
 * ({@link ../setup/setup.render}) and the doctor report
 * ({@link ../doctor/doctor.render}) so ONE consistent vocabulary appears across
 * both.
 *
 * The words are **global** and **local project**, and they were chosen because
 * they are the words the user already typed: `--global` and `--local`. Reading
 * `Local project` above a row whose fix is `pragma setup mcp --local` is the
 * whole point — the report names the flag that repairs it. (Earlier these two
 * surfaces said MACHINE/PROJECT, and later "global band"/"project band": a
 * third and a fourth term for the same two things, and "band" is a word nobody
 * outside this repository has ever used for a config scope. This is the single
 * source that unifies it.)
 *
 * The TYPE layer still says `band` — {@link ../setup/types.ScopeBand}, the
 * `band` field on a plan row, the `bands.ts` filename. That is deliberate and
 * separate: renaming the type system is a wider change than renaming what a
 * user reads, and nothing here leaks the type's word into a sentence.
 */

/** The user-facing display label for each of the two config scopes. */
export const BAND_LABELS: Record<"project" | "global", string> = {
  global: "Global",
  project: "Local project",
};

/**
 * The scope phrase in running text — the lowercase form of {@link BAND_LABELS},
 * plus the word for "both". Authored here rather than lowercased at the call
 * site so a reader grepping for either spelling lands in one file.
 */
export const SCOPE_PHRASES: Record<"project" | "global" | "both", string> = {
  global: "global",
  project: "local project",
  both: "global and local project",
};
