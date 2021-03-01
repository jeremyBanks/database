// deno-lint-ignore-file no-empty-interface

import * as sqlite from "https://deno.land/x/postgres@v0.8.0/mod.ts";

import * as driver from "../sql/driver.ts";

type Json = number | string | null | JsonArray | JsonRecord;
interface JsonArray extends Array<Json> {}
interface JsonRecord extends Record<string, Json> {}

export type Meta = driver.Meta<{
  Value: Json | Date;
}>;

export class Driver implements driver.Driver<Meta> {}

const postgresDriver = new Driver();
export { postgresDriver as driver };
