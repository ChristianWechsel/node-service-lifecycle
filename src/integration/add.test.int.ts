import { add } from "../math/add.js";

describe("add – integration", () => {
  it("chains multiple additions correctly", () => {
    const result = add(add(1, 2), add(3, 4));
    expect(result).toBe(10);
  });
});
