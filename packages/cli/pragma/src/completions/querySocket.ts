/**
 * Connect to a Unix domain socket, send a partial string, and
 * collect the response.
 *
 * Opens a Bun TCP connection to the socket, writes the partial
 * terminated by a newline, and accumulates response chunks until
 * the server closes the connection. The newline ensures the
 * server's data handler fires even for an empty partial.
 *
 * @note Impure — opens a Unix socket connection, performs I/O.
 */
export default function querySocket(
  socketPath: string,
  partial: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    Bun.connect({
      unix: socketPath,
      socket: {
        open(socket) {
          socket.write(`${partial}\n`);
          socket.flush();
        },
        data(_socket, data) {
          chunks.push(Buffer.from(data));
        },
        close() {
          resolve(
            Buffer.concat(chunks)
              .toString("utf-8")
              .replace(/\r?\n$/, ""),
          );
        },
        error(_socket, err) {
          reject(err);
        },
      },
    }).catch(reject);
  });
}
