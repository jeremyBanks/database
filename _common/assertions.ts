/** Returns the name and source location of the caller of the caller of this. */
const caller = () =>
  (new Error()).stack?.split(/\n\ \ /g)[3]?.trim().slice(3) ?? `<unknown>`;

export class AssertionError extends Error {
  name = "AssertionError";
}

export function assert<T>(
  condition: T,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new AssertionError(message ?? `assertion failed in ${caller()}`);
  }
}

/** Converts a value to the untyped `any` type. */
// deno-lint-ignore no-explicit-any
export function untyped(x: any): any {
  return x;
}

/** Converts a value to the untyped `unknown` type. */
// deno-lint-ignore no-explicit-any
export function unknown(x: any): unknown {
  return x;
}

/** Converts `any` or `unknown`-typed values to `never`. */
export function typed<T>(x: T): unknown extends T ? never : T {
  // deno-lint-ignore no-explicit-any
  return x as any;
}

export function expect<T>(
  value: T,
  message?: string,
): NonNullable<T> {
  assert(value != null, message ?? `expected non-null value but was ${value}`);
  return value as NonNullable<T>;
}

export class NotImplementedError extends Error {
  name = "NotImplementedError";
}

// deno-lint-ignore no-explicit-any
export const notImplemented = (message?: string): any => {
  throw new NotImplementedError(message ?? `not implemented in ${caller()}`);
};

export const unreachable = (message?: string): never => {
  throw new TypeError(
    message ??
      `logic error: this code was expected to be unreachable in ${caller()}`,
  );
};
