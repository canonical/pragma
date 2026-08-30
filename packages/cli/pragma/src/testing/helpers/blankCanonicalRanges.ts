/**
 * Blank the @canonical/* dependency ranges inside a scaffolded application's
 * `my-app/package.json` — identically on every snapshot — before a byte
 * comparison. The application generator resolves its range through each
 * producer's OWN `npm view` call (no timeout, no shared cache), so an
 * asymmetric registry outcome (one producer reaches npm and another does
 * not, or a @canonical/* release lands between the calls) would turn
 * `^0.34.0` vs `^0.33.0` across all 11 ranges into a red that says nothing
 * about the code under test. The networked cases prove the TEMPLATE surface;
 * range truth belongs to the offline cells, where the outcome is forced
 * (`capabilities/create/shippedCreate.subprocess.test.ts`).
 *
 * The regex preserves the dependency KEY (`$1`), so a key-set or
 * non-@canonical divergence still fails; only the range value collapses.
 * Deliberately import-free — a pure string transform no module-graph guard
 * can ever see.
 *
 * @param tree - A tree snapshot (relative path → contents).
 * @param manifestPath - The scaffolded manifest's path within the tree.
 * @returns A NEW map with the manifest's @canonical/* ranges blanked; the
 *   input is untouched. A tree without the manifest comes back copied as-is.
 */
export function blankCanonicalRanges(
  tree: ReadonlyMap<string, string>,
  manifestPath = "my-app/package.json",
): Map<string, string> {
  const out = new Map(tree);
  const manifest = out.get(manifestPath);
  if (manifest !== undefined) {
    out.set(
      manifestPath,
      manifest.replaceAll(/("@canonical\/[^"]+": )"[^"]+"/g, '$1"<range>"'),
    );
  }
  return out;
}
