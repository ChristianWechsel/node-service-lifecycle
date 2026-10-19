import type { Logger } from "@christian-wechsel/logger";
import { Health } from "../health/health.js";
import { StartUp } from "./startup.js";

describe("StartUp", () => {
  let startup: StartUp;
  let logger: Logger;
  let health: Health;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    health = new Health();
    startup = new StartUp(logger, health);
  });

  it("logs startup and marks the service healthy after all handlers complete", async () => {
    const setStatus = jest.spyOn(health, "setStatus");

    await startup.start();

    expect(logger.info).toHaveBeenCalledWith("Starting up...");
    expect(setStatus).toHaveBeenCalledWith("ok");
  });

  it("runs handlers sequentially in registration order and passes the logger", async () => {
    let finishFirstHandler: () => void = () => {};
    const firstHandlerFinished = new Promise<void>((resolve) => {
      finishFirstHandler = resolve;
    });
    const events: string[] = [];
    const receivedLoggers: Logger[] = [];

    startup.registerHandler(
      jest.fn(async (params: { logger: Logger }) => {
        events.push("first-started");
        receivedLoggers.push(params.logger);
        await firstHandlerFinished;
        events.push("first-finished");
      }),
    );
    startup.registerHandler(
      jest.fn(async (params: { logger: Logger }) => {
        events.push("second-started");
        receivedLoggers.push(params.logger);
      }),
    );

    const startPromise = startup.start();
    await Promise.resolve();

    expect(events).toEqual(["first-started"]);

    finishFirstHandler();
    await startPromise;

    expect(events).toEqual([
      "first-started",
      "first-finished",
      "second-started",
    ]);
    expect(receivedLoggers).toEqual([logger, logger]);
  });

  it("logs a handler error and skips the remaining handlers", async () => {
    const failedHandler = jest
      .fn()
      .mockRejectedValue(new Error("startup failed"));
    const laterHandler = jest.fn().mockResolvedValue(undefined);
    const setStatus = jest.spyOn(health, "setStatus");
    startup.registerHandler(failedHandler);
    startup.registerHandler(laterHandler);

    await startup.start();

    expect(failedHandler).toHaveBeenCalledWith({ logger });
    expect(laterHandler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("Error: startup failed");
    expect(setStatus).toHaveBeenCalledWith("not-ok");
  });
});