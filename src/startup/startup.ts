import type { Logger } from "@christian-wechsel/logger";
import type { Health } from "../health/health.js";

type Handler = (params: { logger: Logger }) => Promise<void>;

export class StartUp {
  private handlers: Handler[];

  constructor(
    private logger: Logger,
    private health: Health,
  ) {
    this.handlers = [];
  }

  registerHandler(handler: Handler) {
    this.handlers.push(handler);
  }

  async start() {
    this.logger.info("Starting up...");
    try {
      for (const handler of this.handlers) {
        await handler({ logger: this.logger });
      }
      this.health.setStatus("ok");
    } catch (error) {
      this.health.setStatus("not-ok");
      this.logger.error(`${error}`);
    }
  }
}
