import { execFileSync } from "node:child_process";

/**
 * Reproducible provenance for entry headers, derived from the current git
 * HEAD (short hash + committer date) rather than wall-clock time, so two
 * collects from the same commit produce identical output.
 *
 * Returns undefined when git is unavailable — the header line is simply
 * omitted in that case.
 */
export function gitProvenance(rootDir: string): string | undefined {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%h %cs"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (!output) {
      return undefined;
    }
    const [hash, date] = output.split(" ");
    return `git ${hash} (${date})`;
  } catch {
    return undefined;
  }
}
