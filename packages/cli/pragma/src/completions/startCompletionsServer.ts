/**
 * Boot a ke-backed completions server on a Unix domain socket.
 *
 * Uses `bootPragma()` for unified store + config initialization, builds
 * the completion tree from all registered commands, and listens on a
 * project-scoped Unix domain socket. Auto-exits after 10 seconds of idle.
 *
 * @note Impure — boots ke store, binds Unix socket, manages process lifecycle.
 */

import { existsSync, unlinkSync } from "node:fs";
import type { GlobalFlags } from "@canonical/cli-core";
import { buildCompleters } from "@canonical/cli-core";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import { bootPragma } from "../domains/shared/runtime.js";
import collectCommands from "../pipeline/collectCommands.js";
import computeSocketPath from "./computeSocketPath.js";
import { IDLE_TIMEOUT_MS } from "./constants.js";
import handleQuery from "./handleQuery.js";

const COMPLETIONS_FLAGS: GlobalFlags = {
  llm: false,
  format: "text",
  verbose: false,
};

/**
 * @note Impure — boots ke store, binds Unix socket, manages process lifecycle.
 */
export default async function startCompletionsServer(): Promise<void> {
  const runtime: PragmaRuntime = await bootPragma();

  const ctx: PragmaContext = { ...runtime, globalFlags: COMPLETIONS_FLAGS };
  const commands = collectCommands(ctx);
  const tree = buildCompleters(commands);

  const socketPath = computeSocketPath(runtime.cwd);

  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }

  let idleTimer: Timer;

  function resetIdle(): void {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      runtime.dispose();
      server.stop();
      try {
        unlinkSync(socketPath);
      } catch {
        // Socket may already be removed.
      }
      process.exit(0);
    }, IDLE_TIMEOUT_MS);
  }

  const server = Bun.listen({
    unix: socketPath,
    socket: {
      async data(socket, rawData) {
        resetIdle();
        const partial = Buffer.from(rawData)
          .toString("utf-8")
          .replace(/\n$/, "");
        const result = await handleQuery(partial, tree, ctx);
        socket.write(result);
        socket.end();
      },
      open() {},
      close() {},
      error() {},
    },
  });

  resetIdle();
}
