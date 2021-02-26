import * as strings from "./strings.ts";
import { Query } from "./driver.ts";
import { SQL } from "./strings.ts";
import { asserts } from "../_common/deps.ts";

const unhelpful: undefined | { encodeIdentifier: undefined } = undefined;

Deno.test("plain string", () => {
  const query = SQL`SELECT 'star'`;
  const prepared = query.forDriver(unhelpful);

  asserts.assertEquals(prepared, ["SELECT 'star'", []]);
});

Deno.test("simple bindings", () => {
  const query = SQL`SELECT ${1}, ${"2"}, ${3}`;
  const prepared = query.forDriver(unhelpful);

  asserts.assertEquals(prepared, ["SELECT ?", []]);
});

Deno.test("simple", () => {
  const query = SQL`select 'star'`;
  const prepared = query.forDriver(unhelpful);

  asserts.assertEquals(prepared, ["select 'star'", []]);
});
