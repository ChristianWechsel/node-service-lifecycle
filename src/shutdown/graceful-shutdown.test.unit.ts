import type { Logger } from "@christian-wechsel/logger";
import { Health } from "../health/health.js";
import { Shutdown } from "./graceful-shutdown.js";

describe("Shutdown", () => {
  let shutdown: Shutdown;
  let logger: Logger;
  let health: Health;
  let originalExitCode: NodeJS.Process["exitCode"];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    health = new Health();
    shutdown = new Shutdown(logger, health);

    jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it("registers shutdown handlers for SIGTERM and SIGINT", () => {
    const processOn = jest
      .spyOn(process, "on")
      .mockImplementation(() => process);

    shutdown.registerShutdownAtProcess();

    expect(processOn).toHaveBeenCalledTimes(2);
    expect(processOn).toHaveBeenNthCalledWith(
      1,
      "SIGTERM",
      expect.any(Function),
    );
    expect(processOn).toHaveBeenNthCalledWith(
      2,
      "SIGINT",
      expect.any(Function),
    );
  });

  it("marks the service unhealthy, runs handlers, and exits on the first signal", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const setStatus = jest.spyOn(health, "setStatus");
    shutdown.registerHandler(handler);

    await expect(shutdown.graceful("SIGTERM")).rejects.toThrow(
      "process.exit called",
    );

    expect(logger.info).toHaveBeenCalledWith(
      "Received SIGTERM, shutting down gracefully",
    );
    expect(setStatus).toHaveBeenCalledWith("not-ok");
    expect(handler).toHaveBeenCalledWith({ signal: "SIGTERM", logger });
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it("runs registered handlers in order", async () => {
    const calls: number[] = [];
    shutdown.registerHandler(async () => {
      calls.push(1);
    });
    shutdown.registerHandler(async () => {
      calls.push(2);
    });

    await expect(shutdown.graceful("SIGINT")).rejects.toThrow(
      "process.exit called",
    );

    expect(calls).toEqual([1, 2]);
  });

  it("does not rerun handlers or exit when shutdown has already started", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    shutdown.registerHandler(handler);

    await expect(shutdown.graceful("SIGTERM")).rejects.toThrow(
      "process.exit called",
    );
    await expect(shutdown.graceful("SIGINT")).resolves.toBeUndefined();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      "Received SIGINT, already shutting down",
    );
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it("sets the exit code when a handler fails and still exits", async () => {
    shutdown.registerHandler(() => Promise.reject(new Error("handler failed")));

    await expect(shutdown.graceful("SIGTERM")).rejects.toThrow(
      "process.exit called",
    );

    expect(process.exitCode).toBe(1);
    expect(process.exit).toHaveBeenCalledTimes(1);
  });
});
