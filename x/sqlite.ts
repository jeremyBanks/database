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

export class Driver
  implements driver.Driver<Meta>, driver.ConnectorOpener<Meta> {
  openConnectorSync(path: string) {
    return new Connector(this, path);
  }
}

export class Connector implements driver.Connector<Meta> {
  constructor(
    readonly driver: Driver,
    private readonly path: string,
  ) {}

  connectSync() {
    const handle = new sqlite.DB(this.path);
    return new Connection(this.driver, handle);
  }
}

export class Connection implements driver.Connection<Meta> {
  _childTransaction?: Transaction;

  constructor(
    readonly driver: Driver,
    private readonly handle: sqlite.DB,
  ) {}

  startTransactionSync() {
    if (this._childTransaction !== undefined) {
      throw new Error(
        ".startTransaction() but we already have a child transaction",
      );
    }
    this.handle.query("BEGIN DEFERRED TRANSACTION").return();
    const transaction = new Transaction(this.driver, this.handle, this);
    this._childTransaction = transaction;
    return transaction;
  }

  lastInsertedIdSync(): ResultValue {
    return this.handle.lastInsertRowId;
  }

  affectedRowsSync(): number {
    return this.handle.changes;
  }

  closeSync() {
    this.handle.close();
  }
}

export class Transaction implements driver.Transaction<Meta> {
  private depth: number;
  _childTransaction?: Transaction;

  constructor(
    readonly driver: Driver,
    private readonly handle: sqlite.DB,
    private readonly parent: Transaction | Connection,
  ) {
    if (this.parent instanceof Connection) {
      this.depth = 1;
    } else {
      this.depth = this.parent.depth + 1;
    }
  }

  startTransactionSync() {
    if (this._childTransaction !== undefined) {
      throw new Error(
        ".startTransaction() but we already have a child transaction",
      );
    }

    // Depth is a unique identifier because there can not be multiple concurrent
    // transactions at the same depth in the same connection in SQLite.
    this.handle.query(`SAVEPOINT TRANSACTION_${this.depth}`).return();
    const transaction = new Transaction(this.driver, this.handle, this);
    this._childTransaction = transaction;
    return transaction;
  }

  commitSync(): undefined {
    if (this.parent._childTransaction !== this) {
      throw new Error(
        ".commit() called but transaction was already finished",
      );
    }

    this.parent._childTransaction = undefined;
    if (this.parent instanceof Connection) {
      this.handle.query("COMMIT TRANSACTION").return();
    } else {
      this.handle.query(`RELEASE TRANSACTION_${this.depth}`).return();
    }
    return;
  }

  rollbackSync(): undefined {
    if (this.parent._childTransaction !== this) {
      throw new Error(
        ".rollback() called but transaction was already finished",
      );
    }

    this.parent._childTransaction = undefined;
    if (this.parent instanceof Connection) {
      this.handle.query("ROLLBACK TRANSACTION").return();
    } else {
      this.handle.query(`ROLLBACK TO TRANSACTION_${this.depth}`).return();
    }
    return;
  }
}

/** A prepared statement, bound in the context of a parent transaction or connection. */
export class PreparedStatement implements driver.PreparedStatement {
  constructor(
    private readonly connectionHandle: sqlite.DB,
    private readonly sql: string,
  ) {}

  querySync(values: Array<BoundValue>) {
    return this.connectionHandle.query(this.sql, values);
  }

  execSync(values: Array<BoundValue>): driver.ExecResult<Meta> {
    this.connectionHandle.query(this.sql, values).return();
    return {
      rowsAffected: this.connectionHandle.changes,
      lastInsertId: this.connectionHandle.lastInsertRowId,
    };
  }
}

const sqliteDriver = new Driver();
export { sqliteDriver as driver };
