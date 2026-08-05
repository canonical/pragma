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

/**
 * Incremental `[graphql] http hit #N ssr|client` counters.
 *
 * Tallied per COMPLETE line so a bounded log tail can never under-count: one
 * failing-prepare probe sequence emits ~92 KB of stack traces, which scrolls
 * early hit lines out of the 16 KB display tail (observed: 14 of 17 ssr hits
 * lost). Counters survive truncation; `logs()` stays a bounded tail for
 * diagnostics only.
 *
 * One {@link HitTally.sink} PER STREAM. Each keeps its own partial-line
 * buffer — interleaving stdout and stderr chunks through a shared buffer
 * would corrupt lines split across data events.
 *
 * Shared by {@link startServer} and {@link startMetroProvider}: the docsite's
 * own graph server and `@canonical/prism-graph-example`'s demo endpoint emit
 * the identical line, which is what lets the proof ask "who fetched this?" of
 * a provider that has never heard of pragma.
 */
interface HitTally {
  /** A per-stream chunk consumer. Call once per stream, never share one. */
  sink: () => (chunkText: string) => void;
  hits: (source: "ssr" | "client") => number;
}

function createHitTally(): HitTally {
  const counts = { ssr: 0, client: 0 };
  return {
    sink: () => {
      let remainder = "";
      return (chunkText: string): void => {
        const lines = (remainder + chunkText).split("\n");
        remainder = lines.pop() ?? "";
        for (const line of lines) {
          const match = line.match(/\[graphql] http hit #\d+ (ssr|client)/);
          if (match) {
            counts[match[1] === "ssr" ? "ssr" : "client"] += 1;
          }
        }
      };
    },
    hits: (source) => counts[source],
  };
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
  {
    timeoutMs = 180_000,
    graphqlUrl,
    env,
  }: {
    timeoutMs?: number;
    /**
     * An endpoint that is ALREADY serving. When given, the launcher spawns
     * no graph of its own (`withGraph.ts` treats a set `VITE_GRAPHQL_URL`
     * as "an endpoint already exists"), and `graphBase` names this URL's
     * origin rather than a port this harness reserved.
     *
     * This is how a cell points the app at a FOREIGN provider — the
     * despecialisation proof runs `@canonical/prism-graph-example` here.
     */
    graphqlUrl?: string;
    /**
     * Extra environment for the child, merged LAST so a cell can override
     * anything above it. Used by the proof to select a deployment.
     */
    env?: Record<string, string>;
  } = {},
): Promise<RunningServer> {
  const port = await getFreePort();
  // A SECOND reserved port for the graph server every script now launches
  // (`src/server/withGraph.ts`), so the six cells never collide on it either.
  // Not reserved when the caller brought its own endpoint: nothing would
  // listen on it, and holding a port the launcher will never use is a lie
  // `graphBase` would then tell.
  const graphPort = graphqlUrl === undefined ? await getFreePort() : undefined;
  const base = `http://localhost:${port}`;
  const graphBase =
    graphqlUrl === undefined
      ? `http://127.0.0.1:${graphPort}`
      : new URL(graphqlUrl).origin;
  // Without a caller-supplied endpoint: deliberately NOT passing
  // VITE_GRAPHQL_URL — and stripping an inherited one. The launcher treats a
  // set VITE_GRAPHQL_URL as "an endpoint already exists" and spawns no graph
  // at all, so leaving a developer's shell value in place would silently
  // test a different graph than GRAPH_PORT names.
  //
  // WITH one, the same hazard is closed the other way round: the value is
  // SET explicitly, never inherited, so a developer's shell cannot redirect
  // the proof at their own graph.
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
  };
  delete childEnv.VITE_GRAPHQL_URL;
  if (graphqlUrl === undefined) {
    childEnv.GRAPH_PORT = String(graphPort);
    // Keep the LAUNCHER's graph-readiness budget strictly under this cell's,
    // so the launcher is always the one that gives up first. Its default is
    // deliberately generous for real use (120s), which is above every budget
    // here — leaving it in place would mean a slow schema compile surfaces as
    // `waitForServer`'s bare "did not respond within Nms" instead of the
    // launcher saying so, the web server booting anyway, and the probe
    // assertions failing with their own refs-cache diagnosis.
    //
    // Neither variable is set for a caller-supplied endpoint: no graph child
    // is spawned, so there is no boot to budget and no port to name.
    childEnv.GRAPH_READY_MS = String(Math.floor(timeoutMs / 2));
  } else {
    childEnv.VITE_GRAPHQL_URL = graphqlUrl;
  }
  Object.assign(childEnv, env);
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
  const tally = createHitTally();
  const tallyStdout = tally.sink();
  const tallyStderr = tally.sink();
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
    hits: tally.hits,
  };
}

/**
 * A running `@canonical/prism-graph-example` demo endpoint — a GraphQL
 * provider over a fictional metro network that has never heard of pragma.
 *
 * This is the foreign half of the despecialisation proof. It is spawned
 * directly rather than through `withGraph.ts` because it is not the app's
 * graph: it has no refs cache, no schema to compile, and no relationship to
 * this app beyond `@canonical/prism-contract`. Pass its `url` to
 * {@link startServer}'s `graphqlUrl` and the launcher will spawn no graph of
 * its own.
 */
export interface RunningProvider {
  /** The GraphQL endpoint, e.g. `http://127.0.0.1:54125/graphql`. */
  url: string;
  /** Stop the provider and its whole process group. */
  stop: () => Promise<void>;
  /** `[graphql] http hit` totals by source, tallied from its stdout. */
  hits: (source: "ssr" | "client") => number;
}

/**
 * Boot the example provider's demo server on a free port and wait until it
 * answers a real operation.
 *
 * Readiness is probed with a POST of `{ __typename }` rather than a GET,
 * because the endpoint answers a GET with a 404 — a "the port accepts
 * connections" probe would pass against the wrong process entirely.
 *
 * Detached spawn + process-GROUP kill in `stop()`, exactly as
 * {@link startServer}: a leaked provider would hold its port into the next
 * run and the app would then render against a stale dataset.
 */
export async function startMetroProvider(
  cwd: string,
  { timeoutMs = 30_000 }: { timeoutMs?: number } = {},
): Promise<RunningProvider> {
  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}/graphql`;
  const tally = createHitTally();
  const tallyStdout = tally.sink();
  const tallyStderr = tally.sink();
  const child: ChildProcess = spawn("bun", ["demo/server.ts"], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderrTail = "";
  child.stdout?.on("data", (chunk: Buffer) => tallyStdout(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderrTail = (stderrTail + text).slice(-4000);
    tallyStderr(text);
  });

  let ready = false;
  const exited = new Promise<never>((_, reject) => {
    child.once("exit", (code) => {
      if (ready) return;
      reject(
        new Error(
          `the example provider exited early (code ${code}) before serving.\n${stderrTail}`,
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
          spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
            stdio: "ignore",
          });
        } else {
          process.kill(-pid, "SIGKILL");
        }
      } catch {
        resolve();
      }
    });

  const waitForProvider = async (): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Infrastructure traffic, so the readiness probe never reports a
            // phantom client hit into the inversion the proof asserts.
            "x-pragma-ssr": "1",
          },
          body: JSON.stringify({ query: "{ __typename }" }),
          signal: AbortSignal.timeout(1_000),
        });
        if (response.status === 200) {
          await response.text();
          return;
        }
      } catch {
        // Not up yet — the deadline below decides when to give up.
      }
      if (Date.now() > deadline) {
        throw new Error(
          `the example provider did not answer at ${url} within ${timeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  try {
    await Promise.race([waitForProvider(), exited]);
    ready = true;
  } catch (error) {
    await stop();
    throw error;
  }
  exited.catch(() => {});

  return { url, stop, hits: tally.hits };
}
