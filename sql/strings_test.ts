import * as strings from "./strings.ts";
import * as driver from "./driver.ts";
import { Query } from "./driver.ts";
import { SQL } from "./strings.ts";
import { asserts } from "../_common/deps.ts";
import { as, assertStatic } from "../_common/typing.ts";

const fakeDriver: driver.Driver<
  driver.Meta<{
    Value: string | number | null;
  }>
> = {};

Deno.test("plain string", () => {
  const query = SQL`SELECT 'star'`;
  const prepared = query.forDriver(fakeDriver);

  // @ts-ignore known failure
  assertStatic as as.Equals<
    typeof prepared,
    [string, []]
  >;

  asserts.assertEquals(prepared, ["SELECT 'star'", []]);
});

Deno.test("multiple value bindings", () => {
  const query = SQL`SELECT ${1}, ${"2"}, ${null}`;
  const prepared = query.forDriver(fakeDriver);

  // @ts-ignore known failure
  assertStatic as as.Extends<
    typeof prepared,
    [string, [number, string, null]]
  >;

  asserts.assertEquals(prepared, ["SELECT ?, ?, ?", [1, "2", null]]);
});

Deno.test("multi-value binding", () => {
  const query = SQL`SELECT ${[1, "2", null]}`;
  const prepared = query.forDriver(fakeDriver);

  // @ts-ignore known failure
  assertStatic as as.Extends<
    typeof prepared,
    [string, [number, string, null]]
  >;

  asserts.assertEquals(prepared, ["SELECT ?, ?, ?", [1, "2", null]]);
});

Deno.test("simple", () => {
  const query = SQL`select 'star'`;
  const prepared = query.forDriver(fakeDriver);

  asserts.assertEquals(prepared, ["select 'star'", []]);
});
