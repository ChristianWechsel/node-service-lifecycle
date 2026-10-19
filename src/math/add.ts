export function add(a: number, b: number): number {
  if (isNaN(a) || isNaN(b)) {
    throw new Error(
      `add: both arguments must be valid numbers, got a=${a}, b=${b}`,
    );
  }
  return a + b;
}
