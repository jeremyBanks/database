import { assert } from "./assertions.ts";

import { structuredClone } from "./cloning.ts";

Deno.test("structuredClone", () => {
  const original = {
    date: new Date(),
    number: Math.random(),
    // deno-lint-ignore no-explicit-any
    self: undefined as any,
  };
  original.self = original;

  const clone = structuredClone(original);

  // They're different objects:
  assert(original !== clone);
  assert(original.date !== clone.date);

  // They're cyclical:
  assert(original.self === original);
  assert(clone.self === clone);

  // They contain equivalent values:
  assert(original.number === clone.number);
  assert(Number(original.date) === Number(clone.date));
});
