// deno-lint-ignore-file require-await require-yield

import { notImplemented } from "../_common/assertions.ts";

import { Mutex } from "../_common/mutex.ts";
import { Infallible, Result } from "../_common/result.ts";

import * as driver from "./driver.ts";

/** Creates a database handle/connector with the given driver and path. This may
    validate the arguments (path), but will not open a connection yet. */
export const open = async <
  Driver extends driver.Driver = driver.Driver,
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Result<Database<Driver>, ConnectorValidationError>> => {
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

  private connections = new Set<Connection<Meta, Driver>>();

  /** Opens a new open connection to the database. */
  async connect(): Promise<Result<Connection<Meta, Driver>, Error>> {
    const driverConnection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      notImplemented("driver missing .connect[Sync] implementation");

    const connection = new Connection<Meta, Driver>(
      this.driver,
      driverConnection,
    );

    this.connections.add(connection);
    return connection;
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

  /** Lock that must be held by the currently-executing child transaction. */
  private transactionLock = new Mutex({});

  /** Starts a new transaction in the connection. If if there is an already an
      active transaction in progress on this connection, this will block until
      it is closed. */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    return new Promise((resolve) => {
      this.transactionLock.use(async () => {
        const transaction = new Transaction<Meta, Driver>();
        resolve(transaction);
        await transaction.closed();
      });
    });
  }

  /** Closes the connection. If there are currently transactions in progress,
      this will block until they have all closed. */
  async close(): Promise<void> {
    await this.transactionLock.dispose();

    this.driverConnection.close
      ? (await this.driverConnection.close())
      : this.driverConnection.closeSync?.();
  }
}

export class Transaction<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta>,
> {
  /** Prepares a SQL query for execution in this transaction. */
  async prepareStatement(
    query: string,
  ): Promise<Result<PreparedStatement<Meta, Driver>, Error>> {
    return notImplemented();
  }

  /** Closes the transaction with changes committed. */
  async commit(): Promise<Result<void, Error>> {
    return notImplemented();
  }

  /** Closes the transaction with changes rolled back. */
  async rollback(): Promise<PreparedStatement<Meta, Driver>> {
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
