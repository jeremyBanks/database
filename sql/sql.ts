// deno-lint-ignore-file require-await require-yield

import { notImplemented } from "../_common/assertions.ts";

import * as driver from "./driver.ts";

/** Creates a database handle/connector with the given driver and path. This may
    validate the arguments (path), but will not open a connection yet. */
export const open = async <
  Meta extends driver.BaseMeta = driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Meta>> => {
  const driver = driverModule.driver;
  const connector = await driver.openConnector?.(path) ??
    driver.openConnectorSync?.(path) ??
    notImplemented("driver missing .open[Sync] implementation");
  return new Database<Meta, Driver>(driver, connector);
};

export class Database<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private driverConnector: driver.Connector<Meta>,
  ) {}

  /** Opens a new open connection to the database. */
  async connect() {
    const connection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      notImplemented("driver missing .connect[Sync] implementation");

    return new Connection<Meta, Driver>(this.driver, connection);
  }

  /** Closes the connection. If there is an active transaction, this will block
      until it is finished. */
  async close(): Promise<void> {
    return notImplemented();
  }
}

export class Connection<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private driverConnection: driver.Connection<Meta>,
  ) {}

  /** Starts a new transaction in the connection. If if there is an already an
      active transaction in progress on this connection, this will block until
      it is closed. */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    return notImplemented();
  }
}

export class Transaction<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta>,
> {
  /** Prepares a SQL query for execution in this transaction. */
  async prepareStatement(
    query: string,
  ): Promise<PreparedStatement<Meta, Driver>> {
    return notImplemented();
  }

  /** Closes the transaction with changes committed. */
  async commit(query: string): Promise<void> {
    return notImplemented();
  }

  /** Closes the transaction with changes rolled back. */
  async rollback(query: string): Promise<PreparedStatement<Meta, Driver>> {
    return notImplemented();
  }

  /** Starts a nested transaction within this transaction. If a nested
      transaction is already in progress, this will block until it is closed.
      While a nested transaction is in progress, queries should be executed
      through the inner-most active transaction, not the parent transaction, or
      else they will block until the child transaction is closed. */
  startTransaction(): Transaction<Meta, Driver> {
    return notImplemented();
  }
}

export class PreparedStatement<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta>,
> {
  /** Executes the query with an optional array of bound values, and
      incrementally reads rows from the database. The iterator should be
      disposed of by calling .return() (which a for await statement will do
      automatically). */
  async *query(
    args?: Array<Meta["BoundValue"]>,
  ): AsyncGenerator<Iterator<Meta["ResultValue"]>> {
    return notImplemented();
  }

  /** Executes the query with an optional array of bound values, returning only
      the first row of results, as an array. */
  async queryRow(
    args?: Array<Meta["BoundValue"]>,
  ): Promise<Array<Meta["ResultValue"]>> {
    return notImplemented();
  }

  /** Executes the query with an optional array of bound values, without
      returning any result rows. A insertedRowId and affectedRowCount value may
      be returned, but note that for some drivers these values may reflect a
      previous query if the executed one did not actually insert or affect any
      rows. (These should only be absent if the driver is certain that they're
      not relevant to the executed query, or doesn't support them at all.) */
  async exec(
    args?: Array<Meta["BoundValue"]>,
  ): Promise<{
    insertedRowId?: Meta["ResultValue"];
    affectedRowCount?: number;
  }> {
    return notImplemented();
  }

  /** Disposes of this object so that any associated resources can be freed.
      Calling dispose multiple times is safe, but any other operations with the
      object may throw an error after it has been disposed. */
  async dispose(): Promise<void> {
    return notImplemented();
  }
}
