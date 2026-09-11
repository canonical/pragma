import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";

/**
 * A spawned dev/preview server under test.
 */
export interface RunningServer {
  /** Base URL, e.g. `http://localhost:54123`. */
  base: string;
  /**
   * Base URL of the GRAPH server the launcher started alongside the web
   * server, e.g. `http://127.0.0.1:54124`. A separate process on a separate
   * port since the PRD-3 split — the suite probes it directly to tell "the
   * graph never came up" apart from "the page rendered wrong".
   */
  graphBase: string;
  /** Stop the server and its whole process group. */
  stop: () => Promise<void>;
  /**
   * The tail of the server's combined stdout+stderr, for log-marker
   * assertions and failure diagnostics. BOUNDED — never count from it; a
   * chatty boot scrolls early lines out. Grows as the child writes; poll it
   * rather than reading once after a request.
   */
  logs: () => string;
  /**
   * Total `/graphql` hits of one source logged since boot, tallied
   * incrementally per line — immune to the bounded `logs()` tail truncating
   * early hit lines. Poll it; counters grow from async pipe chunks.
   */
  hits: (source: "ssr" | "client") => number;
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
  // A SECOND reserved port for the graph server every script now launches
  // (`src/server/withGraph.ts`), so the six cells never collide on it either.
  const graphPort = await getFreePort();
  const base = `http://localhost:${port}`;
  const graphBase = `http://127.0.0.1:${graphPort}`;
  // Deliberately NOT passing VITE_GRAPHQL_URL — and stripping an inherited
  // one. The launcher treats a set VITE_GRAPHQL_URL as "an endpoint already
  // exists" and spawns no graph at all, so leaving a developer's shell value
  // in place would silently test a different graph than GRAPH_PORT names.
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    GRAPH_PORT: String(graphPort),
    // Keep the LAUNCHER's graph-readiness budget strictly under this cell's,
    // so the launcher is always the one that gives up first. Its default is
    // deliberately generous for real use (120s), which is above every budget
    // here — leaving it in place would mean a slow schema compile surfaces as
    // `waitForServer`'s bare "did not respond within Nms" instead of the
    // launcher saying so, the web server booting anyway, and the probe
    // assertions failing with their own refs-cache diagnosis.
    GRAPH_READY_MS: String(Math.floor(timeoutMs / 2)),
  };
  delete childEnv.VITE_GRAPHQL_URL;
  // Capture stderr so a boot crash surfaces the real cause instead of an opaque
  // readiness timeout, and stdout too for request-log assertions (`logs()`).
  const child: ChildProcess = spawn("bun", ["run", script], {
    cwd,
    env: childEnv,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrTail = "";
  let logTail = "";
  // Graph hit counters, tallied incrementally per COMPLETE line so the bounded
  // logTail can never under-count: one failing-prepare probe sequence emits
  // ~92 KB of stack traces, which scrolls early hit lines out of the 16 KB
  // display tail (observed: 14 of 17 ssr hits lost). Counters survive
  // truncation; logs() stays a bounded tail for diagnostics only. One line
  // buffer per stream — interleaving stdout and stderr chunks through a shared
  // buffer would corrupt lines split across data events.
  const hitCounts = { ssr: 0, client: 0 };
  const makeHitTally = (): ((chunkText: string) => void) => {
    let remainder = "";
    return (chunkText: string): void => {
      const lines = (remainder + chunkText).split("\n");
      remainder = lines.pop() ?? "";
      for (const line of lines) {
        const match = line.match(/\[graphql] http hit #\d+ (ssr|client)/);
        if (match) {
          hitCounts[match[1] === "ssr" ? "ssr" : "client"] += 1;
        }
      }
    };
  };
  const tallyStdout = makeHitTally();
  const tallyStderr = makeHitTally();
  const appendLog = (chunk: Buffer): void => {
    logTail = (logTail + chunk.toString()).slice(-16_000);
  };
  child.stdout?.on("data", (chunk: Buffer) => {
    tallyStdout(chunk.toString());
    appendLog(chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrTail = (stderrTail + text).slice(-4000);
    tallyStderr(text);
    appendLog(chunk);
  });

  // Reject readiness immediately if the child exits before it starts serving.
  // Guarded so the exit fired by stop()'s SIGKILL (after readiness) is ignored.
  let ready = false;
  const exited = new Promise<never>((_, reject) => {
    child.once("exit", (code) => {
      if (ready) return;
      reject(
        new Error(
          `\`${script}\` exited early (code ${code}) before serving.\n${stderrTail}`,
        ),
      );
    });
  });

  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      const { pid } = child;
      if (pid == null || child.exitCode != null) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      try {
        if (process.platform === "win32") {
          // `process.kill(-pid)` (process-group kill) is POSIX-only and throws
          // on Windows, which would leave the server holding its port. Use
          // `taskkill /T` to terminate the child and its descendants instead.
          spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
            stdio: "ignore",
          });
        } else {
          // Negative PID → kill the whole process group (the script and the
          // server it spawns), so nothing is left holding the port.
          process.kill(-pid, "SIGKILL");
        }
      } catch {
        resolve();
      }
    });

  try {
    // Whichever settles first: the server responds, or the child dies.
    await Promise.race([
      waitForServer(base, port, timeoutMs, Date.now()),
      exited,
    ]);
    ready = true;
  } catch (error) {
    await stop();
    throw error;
  }

  // Surface (and swallow) the now-irrelevant rejection so it isn't unhandled.
  exited.catch(() => {});

  return {
    base,
    graphBase,
    stop,
    logs: () => logTail,
    hits: (source: "ssr" | "client") => hitCounts[source],
  };
}
