import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";

/**
 * A spawned dev/preview server under test.
 */
export interface RunningServer {
  /** Base URL, e.g. `http://localhost:54123`. */
  base: string;
  /** Stop the server and its whole process group. */
  stop: () => Promise<void>;
}

/** Reserve a free TCP port by opening an ephemeral listener and reading it back. */
export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const { port } = address;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("could not determine a free port")));
      }
    });
  });
}

/**
 * Resolve once the server answers an HTTP request on `localhost:<port>`, or
 * reject after `timeoutMs`. Probing over HTTP against `localhost` (rather than a
 * raw TCP connect to a fixed IP) confirms the server is actually serving and
 * works whether it bound IPv4 (`0.0.0.0`, the SSR servers) or IPv6 (`[::1]`,
 * Vite's default) — `fetch`/`localhost` resolves both families.
 */
async function waitForServer(
  base: string,
  port: number,
  timeoutMs: number,
  startedAt: number,
): Promise<void> {
  const deadline = startedAt + timeoutMs;
  for (;;) {
    try {
      // Any HTTP response (even a 404/500) means the server is up.
      await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(
          `server did not respond on ${port} within ${timeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}

/**
 * Spawn an `npm`/`bun` script in `cwd` on a fresh OS-assigned port, wait until
 * it is accepting connections, and return a handle that tears down the whole
 * process group.
 *
 * Flakiness is designed out, not retried away:
 * - **OS-assigned port** (`getFreePort` + `PORT` env) → no collisions across the
 *   six matrix servers.
 * - **Poll until the port accepts a connection** (not a fixed sleep) → no
 *   readiness race; tolerates Vite's first-boot dep-optimization and the
 *   `preview:*` build via a generous timeout.
 * - **Detached spawn + process-group kill** in `stop()` → no zombie servers
 *   leaking ports into the next test.
 */
export async function startServer(
  script: string,
  cwd: string,
  { timeoutMs = 180_000 }: { timeoutMs?: number } = {},
): Promise<RunningServer> {
  const port = await getFreePort();
  const base = `http://localhost:${port}`;
  const child: ChildProcess = spawn("bun", ["run", script], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    detached: true,
    stdio: "ignore",
  });

  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      if (child.pid == null || child.exitCode != null) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      try {
        // Negative PID → kill the whole process group (the script and the
        // server it spawns), so nothing is left holding the port.
        process.kill(-child.pid, "SIGKILL");
      } catch {
        resolve();
      }
    });

  try {
    await waitForServer(base, port, timeoutMs, Date.now());
  } catch (error) {
    await stop();
    throw error;
  }

  return { base, stop };
}
