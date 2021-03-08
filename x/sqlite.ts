import * as sqlite from "https://deno.land/x/sqlite@v2.3.2/mod.ts";

import * as driver from "../sql/driver.ts";

export type ResultValue =
  | null
  | boolean
  | number
  | string
  | bigint
  | Uint8Array;

export type BoundValue = ResultValue | Date;

export type Meta = driver.Meta<{
  BoundValue: BoundValue;
  ResultValue: ResultValue;
}>;

export class Driver implements driver.Driver<Meta> {
  openConnectorSync(path: string) {
    return new Connector(path);
  }
}

const sqliteDriver = new Driver();
export { sqliteDriver as driver };

export class Connector implements driver.Connector<Meta> {
  constructor(private readonly path: string) {}

  connectSync() {
    const innerConnection = new sqlite.DB(this.path);
    return new Connection(innerConnection);
  }
}

export class Connection implements driver.Connection<Meta> {
  constructor(private readonly innerConnection: sqlite.DB) {}

  querySync(
    query: string,
    args: Array<BoundValue>,
  ) {
    return new ResultRows(this.innerConnection.query(query, args));
  }

  startTransactionSync() {
    this.innerConnection.query("BEGIN DEFERRED TRANSACTION").return();
    const transaction = new Transaction(this.innerConnection);
    return transaction;
  }

  lastInsertedIdSync() {
    return this.innerConnection.lastInsertRowId;
  }

  affectedRowsSync() {
    return this.innerConnection.changes;
  }

  closeSync() {
    this.innerConnection.close();
  }
}

export class Transaction implements driver.Transaction<Meta> {
  constructor(
    private readonly innerConnection: sqlite.DB,
    private readonly depth: number = 1,
  ) {}

  querySync(
    query: string,
    args: Array<BoundValue>,
  ) {
    return new ResultRows(this.innerConnection.query(query, args));
  }

  startTransactionSync() {
    // Depth is a unique identifier because there can not be multiple concurrent
    // transactions at the same depth in the same connection in SQLite.
    this.innerConnection.query(`SAVEPOINT TRANSACTION_${this.depth}`).return();
    const transaction = new Transaction(this.innerConnection, this.depth + 1);
    return transaction;
  }

  commitSync() {
    if (this.depth === 1) {
      this.innerConnection.query("COMMIT TRANSACTION").return();
    } else {
      this.innerConnection.query(`RELEASE TRANSACTION_${this.depth}`).return();
    }
  }

  rollbackSync() {
    if (this.depth === 1) {
      this.innerConnection.query("ROLLBACK TRANSACTION").return();
    } else {
      this.innerConnection.query(`ROLLBACK TO TRANSACTION_${this.depth}`)
        .return();
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
