import * as sqlite from "https://deno.land/x/sqlite@v2.3.2/mod.ts";

import * as driver from "../sql/driver.ts";

export type Value = null | boolean | number | string | bigint | Uint8Array;

export type Meta = driver.Meta<{
  Value: Value;
}>;

export class Driver implements driver.Driver<Meta> {
  openSync(path: string) {
    return new Connector(this, path);
  }

  encodeIdentifierSync(identifier: string, opts: {
    allowInternal: boolean;
  }): string {
    const allowInternal = opts?.allowInternal ?? false;

    if (identifier.includes("\x00")) {
      throw new TypeError('identifier included a ␀ ("\\x00") character');
    }

    const asUtf8 = (new TextEncoder()).encode(identifier);
    const fromUtf8 = (new TextDecoder()).decode(asUtf8);
    if (identifier !== fromUtf8) {
      throw new TypeError(
        "identifier could not be losslessly encoded as UTF-8",
      );
    }

    // In some cases, SQLite may interpret double-quoted and single-quoted strings
    // to be either string literals or identifiers depending on the context. To
    // avoid any potential ambiguity, we use SQLite's other supported quoting
    // characters, although they aren't standardized.
    let encoded;
    if (!identifier.includes("]")) {
      // If the identifier doesn't include a closing square bracket, we can wrap
      // the value in square brackets.
      encoded = `[${identifier}]`;
    } else {
      // Otherwise, wrap it in backticks and double any backticks it contains.
      encoded = "`" + identifier.replace(/`/g, "``") + "`";
    }

    // Quoting https://github.com/sqlite/sqlite/blob/c8af879e5f501595d5bc59e15621ce25ab76d566/src/build.c#L879-L881
    //
    // > The sqlite3CheckObjectName routine is used to check if the UTF-8
    // > string zName is a legal unqualified name for a new schema object (table,
    // > index, view or trigger). All names are legal except those that begin
    // > with the string "sqlite_" (in upper, lower or mixed case). This portion
    // > of the namespace is reserved for internal use.
    const identifierIsInternal = /^sqlite_/i.test(identifier);
    if (identifierIsInternal && !allowInternal) {
      throw new TypeError(
        `Internal SQLite identifier ${
          JSON.stringify(identifier)
        } is not allowed.`,
      );
    }

    return encoded;
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

  startSync() {
    const transaction = new Transaction(this.driver, this.handle, this);
    this.handle.query(`SAVEPOINT ${transaction.name}`).return();
    return transaction;
  }

  dispose() {
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

  commitSync() {
    this.connectionHandle.query(`RELEASE ${this.name}`).return();
  }

  rollbackSync() {
    this.connectionHandle.query(`ROLLBACK TO ${this.name}`).return();
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
