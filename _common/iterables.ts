import { assert, unreachable } from "./assertions.ts";

export type Orderable =
  | Array<Orderable>
  | number
  | string
  | bigint
  | undefined
  | boolean
  | Uint8Array
  | null;

/**
 * Compares two Orderable objects, using a total ordering that extends the
 * IndexedDB specification's key ordering (indexedDB.cmp(...)) defined at
 * https://github.com/w3c/IndexedDB/blob/89977452423aa5afc451/index.bs#L643-L732
 * to include undefined (before everything), null (before everything else),
 * booleans (false before true before everything else), NaNs (before other
 * numbers), bigints (after numbers), sparse arrays (missing values are
 * equivalent to undefined), and modifies it by ordering -0 before +0.
 */
export const compare = (
  a: Orderable,
  b: Orderable,
): -1 | 0 | 1 => {
  if (Object.is(a, b)) {
    return 0;
  }

  // order differently-typed values by type

  if (a === undefined) {
    return -1;
  } else if (b === undefined) {
    return +1;
  }

  if (a === null) {
    return -1;
  } else if (b === null) {
    return +1;
  }

  if (typeof a === "boolean" && typeof b !== "boolean") {
    return -1;
  } else if (typeof a !== "boolean" && typeof b === "boolean") {
    return +1;
  }

  if (typeof a === "number" && typeof b !== "number") {
    return -1;
  } else if (typeof a !== "number" && typeof b === "number") {
    return +1;
  }

  if (typeof a === "bigint" && typeof b !== "bigint") {
    return -1;
  } else if (typeof a !== "bigint" && typeof b === "bigint") {
    return +1;
  }

  if (typeof a === "string" && typeof b !== "string") {
    return -1;
  } else if (typeof a !== "string" && typeof b === "string") {
    return +1;
  }

  assert(typeof a === typeof b);

  // order arrays by recursive comparison of corresponding items

  if (typeof a === "object") {
    assert(a instanceof Array);
    assert(b instanceof Array);

    const maxLength = Math.max(a.length, b.length);
    for (let i = 0; i < maxLength; i++) {
      const comparison = compare(a[i], b[i]);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  }

  //

  // then bigints

  // then strings

  // order NaN before all other numbers
  if (Object.is(a, NaN)) {
    return -1;
  } else if (Object.is(b, NaN)) {
    return +1;
  }

  // order -0 before +0
  if (Object.is(a, -0) && Object.is(b, +0)) {
    return -1;
  } else if (Object.is(a, +0) && Object.is(b, -0)) {
    return +1;
  }

  if (typeof a === typeof b && typeof a !== "object") {
    // both primitive values of same type
    if (a < b) {
      return -1;
    } else if (a > b) {
      return +1;
    }
  }

  throw new TypeError("cannot compare non-orderable values");
};

/**
 * Returns a sorted array with values from an iterable, where each entry is
 * sorted according to the result of the given key function. The key function
 * must return one of the natively-sortable types in JavaScript -- number,
 * string, bigint -- or undefined, or null, or a (potentially nested) array of
 * such values.
 */
export const sort = <Input>(
  input: Iterable<Input>,
  keyFn: (item: Input) => Orderable,
): Array<Input> =>
  [
    ...map(input, (item): [Orderable, Input] => [keyFn(item), item]),
  ].sort(([a, _a_value], [b, _b_value]) => compare(a, b)).map((
    [_orderable, item],
  ) => item);

/** Lazily maps a function over an iterable. */
export const map = function* <In, Out>(
  input: Iterable<In>,
  mapFn: (item: In) => Out,
): Iterable<Out> {
  for (const item of input) {
    yield mapFn(item);
  }
};

export const first = <Input>(input: Iterable<Input>): Input | void => {
  for (const item of input) {
    return item;
  }
};
