export * from "./_typing/shopify.ts";
export * from "./_typing/rome.ts";
export * as as from "./_typing/assert_static.ts";
export { assertStatic } from "./_typing/assert_static.ts";

import * as as from "./_typing/assert_static.ts";
import { assertStatic } from "./_typing/assert_static.ts";

/** Workaround for defining intersection types as extended interfaces. */
export type Intersection<
  A = unknown,
  B = unknown,
  C = unknown,
  D = unknown,
  E = unknown,
  F = unknown,
  G = unknown,
  H = unknown,
> = A & B & C & D & E & F & G & H;

export type Union<
  A = unknown,
  B = unknown,
  C = unknown,
  D = unknown,
  E = unknown,
  F = unknown,
  G = unknown,
  H = unknown,
> = A | B | C | D | E | F | G | H;

export default {
  as,
  assertStatic,
};
