export type AddTestdata = {
  name: string;
  a: number;
  b: number;
  expected: number;
};

export class AddTestdataFactory {
  positive_numbers(): AddTestdata {
    return { name: "positive_numbers", a: 2, b: 3, expected: 5 };
  }

  negative_numbers(): AddTestdata {
    return { name: "negative_numbers", a: -4, b: -6, expected: -10 };
  }

  mixed_signs(): AddTestdata {
    return { name: "mixed_signs", a: 10, b: -3, expected: 7 };
  }

  zero(): AddTestdata {
    return { name: "zero", a: 0, b: 0, expected: 0 };
  }
}
