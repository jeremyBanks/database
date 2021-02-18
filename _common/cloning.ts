export const structuredClone = <Value extends StructuredClonable>(
  value: Value,
): Value => {
  // deno-lint-ignore no-explicit-any
  const core = (Deno as any).core;
  return core.deserialize(core.serialize(value));
};

export type StructuredClonable =
  | { [key: string]: StructuredClonable }
  | Array<StructuredClonable>
  | ArrayBuffer
  | ArrayBufferView
  | BigInt
  | bigint
  | Blob
  // deno-lint-ignore ban-types
  | Boolean
  | boolean
  | Date
  | Error
  | EvalError
  | Map<StructuredClonable, StructuredClonable>
  // deno-lint-ignore ban-types
  | Number
  | number
  | RangeError
  | ReferenceError
  | RegExp
  | Set<StructuredClonable>
  // deno-lint-ignore ban-types
  | String
  | string
  | SyntaxError
  | TypeError
  | URIError;
