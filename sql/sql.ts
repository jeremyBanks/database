/** @fileoverview Package sql a generic interface around SQL (or SQL-like) databases.
 *
 * Inspired by https://golang.org/src/database/sql/sql.go
 */
import * as driver from "./driver.ts";
import { SQLString } from "./strings.ts";

import Context from "../_common/context.ts";
import { assert, notImplemented, unreachable } from "../_common/assertions.ts";

export const open = async <
  Meta extends driver.BaseMeta = driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Meta>> => {
  const driver = driverModule.driver;
  const connector = driver.open
    ? await driver.open(path)
    : driver.openSync
    ? driver.openSync(path)
    : notImplemented("driver missing .open[Sync] implementation");
  return new Database<Meta, Driver>(driver, connector);
};

/**
 * `Database` is a database handle representing a pool of zero or more underlying connections.
 */
export class Database<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private driverConnector: driver.Connector<Meta>,
  ) {}

  async connect() {
    const connection = this.driverConnector.connect
      ? await this.driverConnector.connect()
      : this.driverConnector.connectSync
      ? this.driverConnector.connectSync()
      : notImplemented("driver missing .connect[Sync] implementation");

    return new Connection<Meta, Driver>(this.driver, connection);
  }
}

export class Connection<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private driverConnection: driver.Connection<Meta>,
  ) {}

  async transaction<Result>(
    f: (transaction: Transaction<Meta, Driver>) => Result,
  ): Promise<Result> {
    const driverTransaction = this.driverConnection.start
      ? await this.driverConnection.start()
      : this.driverConnection.startSync
      ? this.driverConnection.startSync()
      : notImplemented("driver connection missing .start[Sync] implementation");
    const transaction = new Transaction<Meta, Driver>(
      this.driver,
      driverTransaction,
    );
    try {
      const result = await f(transaction);
      driverTransaction.commit();
      return result;
    } catch (error) {
      driverTransaction.rollback();
      throw error;
    }
  }
}

export class Transaction<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private driverTransaction: driver.Transaction<Meta>,
  ) {}

  query(
    query: SQLString<Meta["Value"]>,
  ): AsyncIterable<Iterable<Meta["Value"]>>;
  query(
    query: string,
    args?: Array<Meta["Value"]>,
  ): AsyncIterable<Iterable<Meta["Value"]>>;
  query(
    query: SQLString<Meta["Value"]> | string,
    args?: Array<Meta["Value"]>,
  ): AsyncGenerator<Iterable<Meta["Value"]>> {
    let sqlQuery;
    if (query instanceof SQLString) {
      assert(args === undefined);
      sqlQuery = query.sql(driver);
      args = query.args();
    } else {
      assert(typeof query === "string");
      sqlQuery = query;
    }
    return this._query(sqlQuery, args);
  }

  // This is only a separate method because TypeScript doesn't allow overloaded
  // generator definitions.
  private async *_query(
    query: string,
    args?: Array<Meta["Value"]>,
  ): AsyncGenerator<Iterable<Meta["Value"]>> {
    const statement = this.driverTransaction.prepare
      ? await this.driverTransaction.prepare(query)
      : this.driverTransaction.prepareSync
      ? this.driverTransaction.prepareSync(query)
      : notImplemented(
        "driver transaction missing .prepare[Sync] implementation",
      );

    for await (
      const row of statement.query
        ? statement.query(args)
        : statement.querySync
        ? statement.querySync(args)
        : notImplemented("driver statement missing .query[Sync] implementation")
    ) {
      yield row;
    }
  }
}
