import { QUERY_TIMEOUT_MS } from "./constants.js";

/**
 * Connect to a Unix domain socket, send a partial string, and
 * collect the response.
 *
 * Opens a Bun connection to the socket, writes the partial terminated by a
 * newline, and accumulates response chunks until the server closes the
 * connection. The whole exchange is bounded by {@link QUERY_TIMEOUT_MS}: if a
 * wedged or slow server never replies, the promise rejects rather than hanging
 * the shell's tab-completion indefinitely.
 *
 * @param socketPath - Absolute path to the Unix domain socket.
 * @param partial - The partial CLI input to send for completion.
 * @returns The server's response with trailing newline stripped.
 *
 * @note Impure
 */
export default function querySocket(
  socketPath: string,
  partial: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    let openSocket: { end: () => void } | undefined;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Close the connection so a hung server does not leak an open socket.
      openSocket?.end();
      reject(
        new Error(`Completion query timed out after ${QUERY_TIMEOUT_MS}ms`),
      );
    }, QUERY_TIMEOUT_MS);

    const settle = (run: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      run();
    };

    Bun.connect({
      unix: socketPath,
      socket: {
        open(socket) {
          openSocket = socket;
          socket.write(`${partial}\n`);
          socket.flush();
        },
        data(_socket, data) {
          chunks.push(Buffer.from(data));
        },
        close() {
          settle(() =>
            resolve(
              Buffer.concat(chunks)
                .toString("utf-8")
                .replace(/\r?\n$/, ""),
            ),
          );
        },
        error(_socket, err) {
          settle(() => reject(err));
        },
      },
    }).catch((err) => settle(() => reject(err)));
  });
}
