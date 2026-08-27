/**
 * The kebab-case CLI flag form of a camelCase prompt name — the SINGLE
 * algorithm every user-facing surface uses. Error messages, `--llm` help,
 * and replay commands must all name the same flag the CLI actually
 * registers (`registerFromBarrel` uses this same case-boundary split), or
 * an error tells the user to pass a flag that does not exist: the old
 * per-capital split turned `componentURL` into `--component-u-r-l` while
 * help and Commander said `--component-url`.
 */
export default function formatFlagName(promptName: string): string {
  return promptName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
