import * as postgres from "https://deno.land/x/postgres/mod.ts";

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
    const innerClient = new postgres.Client(this.path);
    await innerClient.connect();
    return new Connection(innerClient);
  }
}

export class Connection implements driver.Connection<Meta> {
  constructor(
    private readonly innerClient: postgres.Client,
  ) {}

  async query(
    sqlString: string,
    args: Array<BoundValue>,
  ) {
    const result = await this.innerClient.queryArray<ResultValue[]>(
      sqlString,
      ...args,
    );
    const rowIterator = result.rows[Symbol.iterator]();
    return new ResultRows(rowIterator);
  }

  async startTransaction() {
    await this.innerClient.queryArray("BEGIN TRANSACTION");
    const transaction = new Transaction(this.innerClient);
    return transaction;
  }

  async close() {
    await this.innerClient.end();
  }
}

export class Transaction implements driver.Transaction<Meta> {
  constructor(
    private readonly innerClient: postgres.Client,
    private readonly depth: number = 1,
  ) {}

  async query(
    sqlString: string,
    args: Array<BoundValue>,
  ) {
    const result = await this.innerClient.queryArray<ResultValue[]>(
      sqlString,
      ...args,
    );
    const rowIterator = result.rows[Symbol.iterator]();
    return new ResultRows(rowIterator);
  }

  async startTransaction() {
    // Depth is a unique identifier because there can not be multiple concurrent
    // transactions at the same depth in the same connection in Postgres.
    await this.innerClient.queryArray(`SAVEPOINT TRANSACTION_${this.depth}`);
    const transaction = new Transaction(this.innerClient, this.depth + 1);
    return transaction;
  }

  async commit() {
    if (this.depth === 1) {
      await this.innerClient.queryArray("COMMIT TRANSACTION");
    } else {
      await this.innerClient.queryArray(`RELEASE TRANSACTION_${this.depth}`);
    }
  }

  async rollback() {
    if (this.depth === 1) {
      await this.innerClient.queryArray("ROLLBACK TRANSACTION");
    } else {
      await this.innerClient.queryArray(
        `ROLLBACK TO TRANSACTION_${this.depth}`,
      );
    }
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
