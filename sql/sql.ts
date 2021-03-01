import Context from "../_common/context.ts";
import { notImplemented } from "../_common/assertions.ts";

import * as driver from "./driver.ts";

export const open = async <
  Meta extends driver.BaseMeta = driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Meta>> => {
  const context = Context.TODO;
  const driver = driverModule.driver;
  const connector = await driver.openConnector?.(path) ??
    driver.openConnectorSync?.(path) ??
    notImplemented("driver missing .open[Sync] implementation");
  return new Database<Meta, Driver>(driver, connector);
};

/**
Database is a database handle representing a pool of zero or more underlying 
connections.
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
    const context = Context.TODO;
    const connection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      notImplemented("driver missing .connect[Sync] implementation");

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
    const context = Context.TODO;
    const driverTransaction =
      await this.driverConnection.startTransaction?.() ??
        this.driverConnection.startTransactionSync?.() ??
        notImplemented("driver connection missing .start[Sync] implementation");
    const transaction = new Transaction<Meta, Driver>(
      this.driver,
      driverTransaction,
    );
    try {
      const result = await f(transaction);
      await driverTransaction.commit?.() ??
        driverTransaction.commitSync?.() ??
        notImplemented(
          "driver transaction missing .commit[Sync] implementation",
        );
      return result;
    } catch (error) {
      driverTransaction.rollback?.();
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
    private child?: Transaction<Meta, Driver>,
  ) {}

  async transaction<Result>(
    f: (transaction: Transaction<Meta, Driver>) => Result,
  ): Promise<Result> {
    const context = Context.TODO;

    if (this.child) {
      throw new TypeError(
        "can not .transaction() this transaction while it has an active child transaction.",
      );
    }

    const driverTransaction =
      await this.driverTransaction.startTransaction?.() ??
        this.driverTransaction.startTransactionSync?.() ??
        notImplemented(
          "driver transaction missing .start[Sync] implementation",
        );

    this.child = new Transaction<Meta, Driver>(
      this.driver,
      driverTransaction,
    );

    try {
      const result = await f(this.child);
      await driverTransaction.commit?.() ??
        driverTransaction.commitSync?.() ??
        notImplemented(
          "driver transaction missing .commit[Sync] implementation",
        );
      return result;
    } catch (error) {
      await driverTransaction.rollback?.() ??
        driverTransaction.rollbackSync?.() ??
        notImplemented(
          "driver transaction missing .rollback[Sync] implementation",
        );
      throw error;
    }
  }
  query(
    query: string,
    args?: Array<Meta["Value"]>,
  ): AsyncIterable<Iterable<Meta["Value"]>> {
    if (this.child) {
      throw new TypeError(
        "can not .query() this transaction while it has an active child transaction.",
      );
    }

    return this._query(query, args ?? []);
  }

  // This is only a separate method because TypeScript doesn't allow overloaded
  // generator definitions.
  private async *_query(
    query: string,
    args: Array<Meta["Value"]>,
  ): AsyncGenerator<Iterable<Meta["Value"]>> {
    const context = Context.TODO;

    const statement = await this.driverTransaction.prepareStatement?.(query) ??
      this.driverTransaction.prepareStatementSync?.(query) ??
      notImplemented(
        "driver transaction missing .prepareStatement[Sync] implementation",
      );

    for await (
      const row of statement.query?.(args) ??
        statement.querySync?.(args) ??
        notImplemented("driver statement missing .query[Sync] implementation")
    ) {
      yield row;
    }
  }
}
