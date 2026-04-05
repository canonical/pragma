import { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { serveStream } from "./serveStream.js";

function createMockReqRes() {
  const req = new IncomingMessage(null as never);
  req.url = "/";
  req.method = "GET";

  const passthrough = new PassThrough();
  const res = new ServerResponse(req);
  res.assignSocket(passthrough as never);

  return { req, res };
}

describe("serveStream", () => {
  it("calls the factory with req, awaits statusReady, pipes the stream", async () => {
    const mockPipe = vi.fn((dest: any) => dest);
    const mockRenderer = {
      statusCode: 200,
      statusReady: Promise.resolve(),
      renderToPipeableStream: () => ({
        pipe: mockPipe,
        abort: vi.fn(),
      }),
    };

    const middleware = serveStream(() => mockRenderer);
    const { req, res } = createMockReqRes();

    await middleware(req, res);

    expect(mockPipe).toHaveBeenCalledWith(res);
    expect(res.statusCode).toBe(200);
  });

  it("uses renderer.statusCode for the response", async () => {
    const mockRenderer = {
      statusCode: 500,
      statusReady: Promise.resolve(),
      renderToPipeableStream: () => ({
        pipe: vi.fn((dest: any) => dest),
        abort: vi.fn(),
      }),
    };

    const middleware = serveStream(() => mockRenderer);
    const { req, res } = createMockReqRes();

    await middleware(req, res);

    expect(res.statusCode).toBe(500);
  });

  it("catches factory errors and returns 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const middleware = serveStream(() => {
      throw new Error("factory error");
    });
    const { req, res } = createMockReqRes();

    await middleware(req, res);

    expect(res.statusCode).toBe(500);
    consoleSpy.mockRestore();
  });
});
