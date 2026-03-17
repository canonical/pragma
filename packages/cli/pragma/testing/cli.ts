import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runCommand(args: string[], cwd?: string): CommandResult {
  const binPath = resolve(import.meta.dirname, "../src/bin.ts");
  const result = spawnSync("bun", ["run", binPath, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

export { runCommand };
export type { CommandResult };
