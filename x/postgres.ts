import * as postgres from "https://deno.land/x/postgres@v0.8.0/mod.ts";

import { notImplemented } from "../_common/assertions.ts";

import * as driver from "../sql/driver.ts";

type Json = number | string | null | JsonArray | JsonRecord;
// deno-lint-ignore no-empty-interface
interface JsonArray extends Array<Json> {}
// deno-lint-ignore no-empty-interface
interface JsonRecord extends Record<string, Json> {}

type BoundValue = Json | Date;
type ResultValue = Json | Date;

export type Meta = driver.Meta<{
  BoundValue: BoundValue;
  ResultValue: ResultValue;
}>;

export class Driver implements driver.Driver<Meta> {
  openConnectorSync(path: string) {
    return new Connector(path);
  }
}

const postgresDriver = new Driver();
export { postgresDriver as driver };

export class Connector implements driver.Connector<Meta> {
  constructor(private readonly path: string) {}

  async connect() {
    const innerConnection = new postgres.Client(this.path);
    await innerConnection.connect();
    return new Connection(innerConnection);
  }
}

export class Connection implements driver.Connection<Meta> {
  constructor(private readonly innerConnection: postgres.Client) {}

  async query(
    sqlString: string,
    args: Array<BoundValue>,
  ) {
    const result = await this.innerConnection.queryArray<ResultValue[]>(
      sqlString,
      ...args,
    );
    const rowIterator = result.rows[Symbol.iterator]();
    return new ResultRows(rowIterator);
  }

  async close() {
    await this.innerConnection.end();
  }
}

export class ResultRows implements driver.ResultRows<Meta> {
  constructor(private innerRows: Iterator<Array<Meta["ResultValue"]>>) {}

  nextSync() {
    return this.innerRows.next().value;
  }

  closeSync() {
    this.innerRows.return?.();
  }
}
