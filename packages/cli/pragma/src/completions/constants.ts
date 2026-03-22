/**
 * Completions server constants.
 *
 * Shared by both the server (idle timeout, socket naming) and
 * client (poll timing, spawn timeout) sides of the completions system.
 */

/** Server auto-exit timeout in milliseconds after last request. */
export const IDLE_TIMEOUT_MS = 10_000;

/** Path prefix for Unix domain socket files. */
export const SOCKET_PREFIX = "/tmp/pragma-completions-";

/** Interval between socket existence checks in milliseconds. */
export const POLL_INTERVAL_MS = 50;

/** Maximum time to wait for a spawned server to become ready. */
export const SPAWN_TIMEOUT_MS = 5_000;
