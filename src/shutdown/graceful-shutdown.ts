import type { Logger } from "@christian-wechsel/logger";
import type { Health } from "../health/health.js";

type ShutdownSignal = "SIGTERM" | "SIGINT";
type Handler = (params: {
  signal: ShutdownSignal;
  logger: Logger;
}) => Promise<void>;

export class Shutdown {
  private count: number;
  private handlers: Handler[];

  constructor(
    private logger: Logger,
    private health: Health,
  ) {
    this.count = 0;
    this.handlers = [];
  }

  registerHandler(handler: Handler) {
    this.handlers.push(handler);
  }

  registerShutdownAtProcess() {
    process.on("SIGTERM", () => {
      this.graceful("SIGTERM");
    });
    process.on("SIGINT", () => {
      this.graceful("SIGINT");
    });
  }

  async graceful(signal: ShutdownSignal) {
    const isFirstShutdown = this.isFirstShutdown();
    this.incrementShutdownCount();

    if (isFirstShutdown) {
      this.logger.info(`Received ${signal}, shutting down gracefully`);
      this.health.setStatus("not-ok");

      try {
        await this.onFirstShutdown(signal);
      } catch (error) {
        process.exitCode = 1;
      }
      process.exit();
    } else {
      this.logger.info(`Received ${signal}, already shutting down`);
    }
  }

  private async onFirstShutdown(signal: ShutdownSignal) {
    for (const handler of this.handlers) {
      await handler({ signal, logger: this.logger });
    }
  }

  private isFirstShutdown(): boolean {
    return this.count === 0;
  }

  private incrementShutdownCount(): void {
    this.count++;
  }
}
