import { Health } from "./health.js";

describe("Health", () => {
  let health: Health;

  beforeEach(() => {
    health = new Health();
  });

  describe("initial state", () => {
    it("is ok without any checks", async () => {
      expect(await health.getStatus()).toBe("ok");
    });

    it("has an empty log", () => {
      expect(health.getLog()).toEqual([]);
    });
  });

  describe("setStatus", () => {
    it("changes the reported status", async () => {
      health.setStatus("not-ok");

      expect(await health.getStatus()).toBe("not-ok");
    });

    it("notifies the callback when the status changes", () => {
      const callback = jest.fn();
      health.onStatusChange(callback);

      health.setStatus("not-ok");

      expect(callback).toHaveBeenCalledWith("not-ok");
    });

    it("does not notify the callback when the status stays ok", () => {
      const callback = jest.fn();
      health.onStatusChange(callback);

      health.setStatus("ok");

      expect(callback).not.toHaveBeenCalled();
    });

    it("notifies the callback only once when not-ok is set repeatedly", () => {
      const callback = jest.fn();
      health.onStatusChange(callback);

      health.setStatus("not-ok");
      health.setStatus("not-ok");
      health.setStatus("not-ok");

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("notifies the callback again when the status changes back and forth", () => {
      const callback = jest.fn();
      health.onStatusChange(callback);

      health.setStatus("not-ok");
      health.setStatus("ok");
      health.setStatus("not-ok");

      expect(callback.mock.calls).toEqual([["not-ok"], ["ok"], ["not-ok"]]);
    });

    it("does not fail without a registered callback", () => {
      expect(() => health.setStatus("not-ok")).not.toThrow();
    });
  });

  describe("log", () => {
    it("returns added entries in insertion order", () => {
      health.addLog("first");
      health.addLog("second");

      expect(health.getLog()).toEqual(["first", "second"]);
    });
  });

  describe("checks", () => {
    it("stays ok when all checks succeed", async () => {
      health.addChecks(() => Promise.resolve(true));
      health.addChecks(() => Promise.resolve(true));

      expect(await health.getStatus()).toBe("ok");
    });

    it("becomes not-ok when one check fails", async () => {
      health.addChecks(() => Promise.resolve(true));
      health.addChecks(() => Promise.resolve(false));

      expect(await health.getStatus()).toBe("not-ok");
    });

    it("returns to ok when all checks succeed after failing", async () => {
      const callback = jest.fn();
      const check = jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      health.onStatusChange(callback);
      health.addChecks(check);

      expect(await health.getStatus()).toBe("not-ok");
      expect(await health.getStatus()).toBe("ok");
      expect(callback.mock.calls).toEqual([["not-ok"], ["ok"]]);
    });

    it("runs every registered check on each status request", async () => {
      const check = jest.fn().mockResolvedValue(true);
      health.addChecks(check);

      await health.getStatus();
      await health.getStatus();

      expect(check).toHaveBeenCalledTimes(2);
    });

    it("notifies the callback when a failing check changes the status", async () => {
      const callback = jest.fn();
      health.onStatusChange(callback);
      health.addChecks(() => Promise.resolve(false));

      await health.getStatus();

      expect(callback).toHaveBeenCalledWith("not-ok");
    });
  });
});
