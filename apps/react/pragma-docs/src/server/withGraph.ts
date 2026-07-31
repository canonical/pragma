/**
 * The launcher: bring the graph server up, then run a web command against it.
 *
 * Every `dev*` / `preview*` script goes through here —
 * `bun src/server/withGraph.ts <command> [args…]` — so the six cells of the
 * server matrix all get the same graph, the same way, without any of them
 * knowing how the graph is started.
 *
 * **It lives in `src/server/` on purpose.** A `scripts/` directory would be
 * covered by neither gate: `tsconfig.json`'s `include` lists `src` (plus the
 * named config files) and `biome.json`'s `files.includes` lists `src`. A
 * launcher that no longer type-checks is a launcher that breaks every script
 * at once, so it belongs where the checks can see it.
 *
 * What it does, in order:
 *
 * 1. Decide the graph port (`GRAPH_PORT`, else the port in
 *    {@link DEFAULT_GRAPHQL_URL}).
 * 2. If `VITE_GRAPHQL_URL` is already set, spawn NO graph child at all and
 *    point the web command at that endpoint. That is the affordance for
 *    running against a shared or remote graph; it is also what keeps this
 *    launcher from fighting a graph someone already has running.
 * 3. Otherwise spawn `bun src/server/graph.ts`, NOT detached — the e2e
 *    harness spawns the whole script detached and tears it down with a
 *    process-GROUP kill, so a detached grandchild would escape the group and
 *    leak a port into the next cell.
 * 4. Race readiness against the graph child's own exit. If the child dies
 *    first (no refs cache, port in use, …) say so loudly and continue
 *    IMMEDIATELY — waiting out a two-minute budget for a process that is
 *    already dead turns a clear failure into a mysterious timeout.
 * 5. Spawn the web command from `process.argv.slice(2)` verbatim, no shell,
 *    with `VITE_GRAPHQL_URL` injected EXPLICITLY. The explicit injection is
 *    the point: Bun auto-loads `.env`, Vite loads `.env` itself, plain Node
 *    loads nothing — passing the value through the environment is the only
 *    thing all three agree on.
 * 6. Forward SIGINT/SIGTERM to both children, kill the graph when the web
 *    command exits, and exit with the web command's code.
 *
 * No exit from here may leave the graph behind, which is why the signal
 * handlers are installed BEFORE either spawn (a signal during the graph's
 * boot would otherwise orphan it) and why both children carry an `error`
 * listener (an unhandled spawn `error` event terminates the launcher, and at
 * the web spawn the graph is already live).
 *
 * @note Impure — spawns processes, reads the environment, and exits.
 */
import { type ChildProcess, spawn } from "node:child_process";
import {
  DEFAULT_GRAPHQL_URL,
  GRAPHQL_URL_ENV_VAR,
} from "#relay/graphqlEndpoint.js";

/** How long to wait for the graph to answer before giving up on it. */
const READY_BUDGET_MS = Number(process.env.GRAPH_READY_MS) || 120_000;

/** Polling interval while racing readiness. */
const POLL_MS = 150;

const webArgv = process.argv.slice(2);
if (webArgv.length === 0) {
  console.error(
    "[withGraph] usage: bun src/server/withGraph.ts <command> [args…]",
  );
  process.exit(2);
}
const [webCommand, ...webArgs] = webArgv as [string, ...string[]];

/**
 * The graph port: `GRAPH_PORT`, else the app's one port literal.
 *
 * Derived with the SAME rule as `graph.ts` (`Number(…) ||`, not `??`), so an
 * exported-but-blank `GRAPH_PORT` reads as unset in both places. With `??`
 * the launcher kept `""`, `url.port = ""` stripped the port entirely, and it
 * would then probe — and hand the web command — port 80 while the child it
 * spawned listened on the default.
 */
const graphPort = String(
  Number(process.env.GRAPH_PORT) || Number(new URL(DEFAULT_GRAPHQL_URL).port),
);

/** The endpoint a locally-spawned graph would serve. */
const localGraphUrl = ((): string => {
  const url = new URL(DEFAULT_GRAPHQL_URL);
  url.port = graphPort;
  return url.toString();
})();

/**
 * Poll the graph until it answers a real operation with 200, or until the
 * child exits, or until the budget runs out. Never rejects: a graph that
 * failed to come up is a degraded run, not a failed launch — the web server
 * still serves, and the pages that need data say so honestly.
 */
const waitForGraph = async (child: ChildProcess): Promise<void> => {
  /** Why the child is never going to answer, once that is known. */
  let gone: string | undefined;
  child.once("exit", (code) => {
    gone ??= `the graph server exited (code ${code}) before it was ready`;
  });
  // A spawn failure (no `bun` on PATH) arrives as an ASYNCHRONOUS `error`
  // event, not a throw from `spawn` — and an unhandled `error` event
  // terminates the launcher, which is exactly the exit that must not happen
  // while a child is live. Handled, it degrades like any other dead graph.
  child.once("error", (error) => {
    gone ??= `the graph server could not be started (${error instanceof Error ? error.message : String(error)})`;
  });
  const deadline = Date.now() + READY_BUDGET_MS;
  for (;;) {
    if (gone) {
      console.error(
        `[withGraph] ${gone} — continuing WITHOUT a graph; data-bearing pages will render empty`,
      );
      return;
    }
    try {
      const response = await fetch(localGraphUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Marks this as infrastructure traffic, not a browser request, so
          // the graph's hit log does not report a phantom client.
          "x-pragma-ssr": "1",
        },
        body: JSON.stringify({ query: "{ __typename }" }),
        signal: AbortSignal.timeout(1_000),
      });
      if (response.status === 200) {
        await response.text();
        console.info(`[withGraph] graph server ready at ${localGraphUrl}`);
        return;
      }
    } catch {
      // Not up yet (or not up ever) — the loop's exit/deadline arms decide.
    }
    if (Date.now() > deadline) {
      console.error(
        `[withGraph] the graph server did not answer at ${localGraphUrl} within ${READY_BUDGET_MS}ms — continuing WITHOUT it`,
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
};

const configuredUrl = process.env.VITE_GRAPHQL_URL;
let graphChild: ChildProcess | undefined;
let webChild: ChildProcess | undefined;
let graphqlUrl: string;

/**
 * Take both children down with this launcher.
 *
 * Registered BEFORE either spawn, not after both: the graph's boot is the
 * long part of a launch (compiling the schema dominates it), and a
 * PID-directed `kill -TERM` arriving during that window would otherwise hit
 * the default terminate disposition and leave the graph child holding its
 * port. Ctrl-C was always safe — the terminal signals the whole foreground
 * group — but a supervisor or a CI cancellation signals one pid.
 */
const forward = (signal: NodeJS.Signals): void => {
  graphChild?.kill(signal);
  if (webChild) {
    webChild.kill(signal);
    return;
  }
  // Signalled before the web command exists: nothing is left to report an
  // exit code, and installing this handler removed the default disposition,
  // so end the launcher here rather than hang holding the terminal.
  process.exit(1);
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

if (configuredUrl) {
  // PRD-7's affordance, made real: an endpoint was named, so this launcher
  // has no business starting a second one.
  graphqlUrl = configuredUrl;
  console.info(
    `[withGraph] ${GRAPHQL_URL_ENV_VAR} is set (${configuredUrl}) — using that endpoint, spawning no graph server`,
  );
} else {
  graphqlUrl = localGraphUrl;
  console.info(`[withGraph] starting the graph server on ${localGraphUrl}`);
  graphChild = spawn("bun", ["src/server/graph.ts"], {
    stdio: "inherit",
    env: { ...process.env, GRAPH_PORT: graphPort },
  });
  await waitForGraph(graphChild);
}

console.info(
  `[withGraph] starting \`${[webCommand, ...webArgs].join(" ")}\` with ${GRAPHQL_URL_ENV_VAR}=${graphqlUrl}`,
);
webChild = spawn(webCommand, webArgs, {
  stdio: "inherit",
  env: { ...process.env, [GRAPHQL_URL_ENV_VAR]: graphqlUrl },
});

// The graph is already live by this point, so a web command that never
// starts is the one failure that could leave it behind: the `exit` handler
// below never runs, and an unhandled `error` event would take the launcher
// down on the spot. `bun src/server/withGraph.ts vite` — the invocation this
// file documents — reaches it, because `bun <file>` does not put
// `node_modules/.bin` on PATH the way `bun run <script>` does.
webChild.once("error", (error) => {
  console.error(`[withGraph] could not start \`${webCommand}\`:`, error);
  graphChild?.kill("SIGTERM");
  process.exit(1);
});

webChild.once("exit", (code, signal) => {
  graphChild?.kill("SIGTERM");
  process.exit(code ?? (signal ? 1 : 0));
});
