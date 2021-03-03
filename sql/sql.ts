// deno-lint-ignore-file require-await require-yield

import { notImplemented } from "../_common/assertions.ts";

import { Mutex } from "../_common/mutex.ts";
import { Infallible, Result } from "../_common/result.ts";

import * as driver from "./driver.ts";
import { meta } from "./driver.ts";
import * as errors from "./errors.ts";

/** Creates a database handle/connector with the given driver and path.
    @throws {errors.ConnectorValidationError} if the path was invalid.
    */
export const open = async <Driver extends driver.Driver = driver.Driver>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Driver>> => {
  const driver = driverModule.driver;
  const connector = await driver.openConnector?.(path) ??
    driver.openConnectorSync?.(path) ??
    notImplemented("driver missing .open[Sync] implementation");
  return new Database<Driver>(driver, connector);
};

export class Database<Driver extends driver.Driver = driver.Driver> {
  constructor(
    private driver: Driver,
    private driverConnector: driver.Connector<meta<Driver>>,
  ) {}

  private connections = new Set<Connection<Driver>>();

  /** Opens a new open connection to the database.

      @throws {errors.NetworkError}
  */
  async connect(): Promise<Result<Connection<Driver>, Error>> {
    const driverConnection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      notImplemented("driver missing .connect[Sync] implementation");

    const connection = new Connection<Driver>(
      this.driver,
      driverConnection,
    );

    this.connections.add(connection);
    return connection;
  }
}

export class Connection<
  Driver extends driver.Driver,
> {
  constructor(
    private driver: Driver,
    private driverConnection: driver.Connection<meta<Driver>>,
  ) {}

  /** Lock that must be held by the currently-executing child transaction. */
  private transactionLock = new Mutex({});

  /** Starts a new transaction in the connection. If if there is an already an
      active transaction in progress on this connection, this will block until
      it is closed. */
  async startTransaction(): Promise<Transaction<Driver>> {
    return new Promise((resolve) => {
      this.transactionLock.use(async () => {
        const transaction = new Transaction<Driver>();
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
  Driver extends driver.Driver,
> {
  /** Prepares a SQL query for execution in this transaction. */
  async prepareStatement(
    query: string,
  ): Promise<Result<PreparedStatement<Driver>, Error>> {
    return notImplemented();
  }

  async closed(): Promise<void> {
    await this.driverTransaction.closed();
  }

  /** Closes the transaction with changes committed. */
  async commit(): Promise<Result<void, Error>> {
    return notImplemented();
  }

  /** Closes the transaction with changes rolled back. */
  async rollback(): Promise<PreparedStatement<Driver>> {
    return notImplemented();
  }

  /** Starts a nested transaction within this transaction. If a nested
      transaction is already in progress, this will block until it is closed.
      While a nested transaction is in progress, queries should be executed
      through the inner-most active transaction, not the parent transaction, or
      else they will block until the child transaction is closed. */
  startTransaction(): Transaction<Driver> {
    return notImplemented();
  }
}

export class PreparedStatement<
  Driver extends driver.Driver,
> {
  /** Executes the query with an optional array of bound values, and
      incrementally reads rows from the database. The iterator should be
      disposed of by calling .return() (which a for await statement will do
      automatically). */
  async *query(
    args?: Array<meta<Driver, "BoundValue">>,
  ): AsyncGenerator<Iterator<meta<Driver, "ResultValue">>> {
    return notImplemented();
  }

  /** Executes the query with an optional array of bound values, returning only
      the first row of results, as an array. */
  async queryRow(
    args?: Array<meta<Driver, "BoundValue">>,
  ): Promise<Array<meta<Driver, "ResultValue">>> {
    return notImplemented();
  }

  /** Executes the query with an optional array of bound values, without
      returning any result rows. A insertedRowId and affectedRowCount value may
      be returned, but note that for some drivers these values may reflect a
      previous query if the executed one did not actually insert or affect any
      rows. (These should only be absent if the driver is certain that they're
      not relevant to the executed query, or doesn't support them at all.) */
  async exec(
    args?: Array<meta<Driver, "BoundValue">>,
  ): Promise<{
    insertedRowId?: meta<Driver, "ResultValue">;
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
