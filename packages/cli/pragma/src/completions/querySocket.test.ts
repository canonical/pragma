import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import querySocket from "./querySocket.js";

const connectMock = vi.fn();

describe("querySocket", () => {
  beforeEach(() => {
    vi.stubGlobal("Bun", {
      connect: connectMock,
    });
    connectMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes the partial with a newline and trims the trailing newline", async () => {
    const write = vi.fn();
    const flush = vi.fn();

    connectMock.mockImplementation(
      (options: {
        socket: {
          open: (socket: {
            write: (value: string) => void;
            flush: () => void;
          }) => void;
          data: (_socket: unknown, data: Uint8Array) => void;
          close: () => void;
        };
      }) => {
        options.socket.open({ write, flush });
        options.socket.data({}, Buffer.from("block\n"));
        options.socket.close();
        return Promise.resolve({});
      },
    );

    await expect(querySocket("/tmp/pragma.sock", "blo")).resolves.toBe("block");

    expect(write).toHaveBeenCalledWith("blo\n");
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("rejects when the socket emits an error", async () => {
    const socketError = new Error("socket failed");

    connectMock.mockImplementation(
      (options: {
        socket: { error: (_socket: unknown, err: Error) => void };
      }) => {
        options.socket.error({}, socketError);
        return Promise.resolve({});
      },
    );

    await expect(querySocket("/tmp/pragma.sock", "blo")).rejects.toThrow(
      "socket failed",
    );
  });

  it("rejects when Bun.connect fails before the socket opens", async () => {
    connectMock.mockReturnValue(Promise.reject(new Error("connect failed")));

    await expect(querySocket("/tmp/pragma.sock", "blo")).rejects.toThrow(
      "connect failed",
    );
  });
});
