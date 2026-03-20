/**
 * Boot a ke-backed completions server on a Unix domain socket.
 *
 * Reads config, boots the ke store (with cache), builds the completion
 * tree from all registered commands, and listens on a project-scoped
 * Unix domain socket. Auto-exits after 10 seconds of idle. Each
 * incoming query resets the idle timer.
 *
 * @note Impure — boots ke store, binds Unix socket, manages process lifecycle.
 */

import { existsSync, unlinkSync } from "node:fs";
import type { GlobalFlags } from "@canonical/cli-core";
import { buildCompleters } from "@canonical/cli-core";
import { readConfig } from "../config.js";
import { bootStore } from "../domains/shared/bootStore.js";
import type { PragmaContext } from "../domains/shared/context.js";
import type { FilterConfig } from "../domains/shared/types.js";
import { collectCommands } from "../lib/runCli.js";
import computeSocketPath from "./computeSocketPath.js";
import { IDLE_TIMEOUT_MS } from "./constants.js";
import handleQuery from "./handleQuery.js";

export default async function startCompletionsServer(): Promise<void> {
  const cwd = process.cwd();
  const rawConfig = readConfig();
  const config: FilterConfig = {
    tier: rawConfig.tier,
    channel: rawConfig.channel,
  };
  const globalFlags: GlobalFlags = {
    llm: false,
    format: "text",
    verbose: false,
  };

  const store = await bootStore({ cwd });

  const ctx: PragmaContext = { cwd, globalFlags, store, config };
  const commands = collectCommands(ctx);
  const tree = buildCompleters(commands);

  const socketPath = computeSocketPath(cwd);

  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }

  let idleTimer: Timer;

  function resetIdle(): void {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      store.dispose();
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
