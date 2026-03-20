/**
 * Completions server constants.
 *
 * Shared by both the server (idle timeout, socket naming) and
 * client (poll timing, spawn timeout) sides of the completions system.
 */

export const IDLE_TIMEOUT_MS = 10_000;
export const SOCKET_PREFIX = "/tmp/pragma-completions-";
export const POLL_INTERVAL_MS = 50;
export const SPAWN_TIMEOUT_MS = 5_000;
