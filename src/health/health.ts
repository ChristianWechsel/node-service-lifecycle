type HealthStatus = "ok" | "not-ok";
type HealthCheck = () => Promise<boolean>;

export class Health {
  private status: HealthStatus;
  private log: string[];
  private statusChangeCallback?: (status: HealthStatus) => void;
  private checks: HealthCheck[];

  constructor() {
    this.status = "ok";
    this.log = [];
    this.checks = [];
  }

  async getStatus(): Promise<HealthStatus> {
    const results = await Promise.all(this.checks.map((check) => check()));
    if (this.checks.length > 0) {
      this.setStatus(results.includes(false) ? "not-ok" : "ok");
    }
    return this.status;
  }

  setStatus(status: HealthStatus): void {
    const hasChanged = this.status !== status;
    this.status = status;
    if (hasChanged) {
      this.statusChangeCallback?.(status);
    }
  }

  addLog(entry: string): void {
    this.log.push(entry);
  }

  getLog(): string[] {
    return this.log;
  }

  onStatusChange(callback: (status: HealthStatus) => void): void {
    this.statusChangeCallback = callback;
  }

  addChecks(check: HealthCheck): void {
    this.checks.push(check);
  }
}
