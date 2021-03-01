import * as sqlite from "https://deno.land/x/sqlite@v2.3.2/mod.ts";

import * as driver from "../sql/driver.ts";

export type Value = null | boolean | number | string | bigint | Uint8Array;

export type Meta = driver.Meta<{
  Value: Value;
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
  constructor(
    readonly driver: Driver,
    private readonly handle: sqlite.DB,
  ) {}

  startTransactionSync() {
    const transaction = new Transaction(this.driver, this.handle, this);
    this.handle.query(`SAVEPOINT ${transaction.name}`).return();
    return transaction;
  }

  lastInsertedIdSync(): Value {
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
  static nextId = 1;
  readonly name: string;

  constructor(
    readonly driver: Driver,
    private readonly connectionHandle: sqlite.DB,
    parent: Transaction | Connection,
  ) {
    if (parent instanceof Transaction) {
      this.name = `${parent.name}_${Transaction.nextId}`;
    } else {
      this.name = `transaction_${Transaction.nextId}`;
    }
    Transaction.nextId += 1;
  }

  commitSync(): undefined {
    this.connectionHandle.query(`RELEASE ${this.name}`).return();
    return;
  }

  rollbackSync(): undefined {
    this.connectionHandle.query(`ROLLBACK TO ${this.name}`).return();
    return;
  }
}

/** A prepared statement, bound in the context of a parent transaction or connection. */
export class PreparedStatement implements driver.PreparedStatement {
  constructor(
    private readonly connectionHandle: sqlite.DB,
    private readonly sql: string,
  ) {}

  querySync(values: Array<Value>) {
    return this.connectionHandle.query(this.sql, values);
  }

  execSync(values: Array<Value>): driver.ExecResult<Meta> {
    this.connectionHandle.query(this.sql, values).return();
    return {
      rowsAffected: this.connectionHandle.changes,
      lastInsertId: this.connectionHandle.lastInsertRowId,
    };
  }
}

const sqliteDriver = new Driver();
export { sqliteDriver as driver };
