import { add } from "./add.js";
import { AddTestdataFactory } from "./add.testdata.js";

describe("add", () => {
  describe("fail-fast validation", () => {
    it("throws when a is NaN", () => {
      expect(() => add(NaN, 1)).toThrow(
        "add: both arguments must be valid numbers",
      );
    });

    it("throws when b is NaN", () => {
      expect(() => add(1, NaN)).toThrow(
        "add: both arguments must be valid numbers",
      );
    });
  });

  describe("calculations", () => {
    const testData = new AddTestdataFactory();

    it.each([
      testData.positive_numbers(),
      testData.negative_numbers(),
      testData.mixed_signs(),
      testData.zero(),
    ])("$name", ({ a, b, expected }) => {
      expect(add(a, b)).toBe(expected);
    });
  });
});
