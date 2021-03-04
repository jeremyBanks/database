// deno-lint-ignore-file require-await require-yield

import { notImplemented } from "../_common/assertions.ts";
import { async } from "../_common/deps.ts";
import { Mutex } from "../_common/mutex.ts";
import { Infallible, Result } from "../_common/result.ts";

import * as driver from "./driver.ts";
import * as errors from "./errors.ts";

const throwMissingImplementation = (missing = "a required method"): never => {
  throw new errors.MissingImplementationDriverTypeError(
    `Database driver is missing an implementation of ${missing}.`,
  );
};

/**
Creates a database handle/connector with the given driver and path. May
validate the arguments (path), but will not open a connection yet.

May throw `DatabaseConnectorValidationError` if the path is invalid.
*/
export const open = async <
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Meta, Driver>> => {
  const driver = driverModule.driver;
  const connector = await driver.openConnector?.(path) ??
    driver.openConnectorSync?.(path) ??
    throwMissingImplementation("Driver.openConnector[Sync]");
  return new Database(connector);
};

export class Database<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  constructor(private driverConnector: driver.Connector<Meta>) {}

  private connections = new Set<Connection<Meta, Driver>>();

  /**
  Opens a new open connection to the database.

  May throw DatabaseConnectivityError or DatabaseEngineError.
  */
  async connect(): Promise<Connection<Meta, Driver>> {
    const driverConnection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      throwMissingImplementation("Connector.connect[Sync]");

    const connection = new Connection<Meta, Driver>(
      driverConnection,
    );

    this.connections.add(connection);
    return connection;
  }
}

export class Connection<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  constructor(private driverConnection: driver.Connection<Meta>) {}

  /**
  Lock that must be held by the currently-open child transaction.
  */
  _transactionLock = Mutex.marker();

  /**
  Starts a new transaction in the connection. If if there is an already an
  active transaction in progress on this connection, this will block until
  it is closed.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    const result = async.deferred<Transaction<Meta, Driver>>();
    this._transactionLock.use(async () => {
      // Don't start the transaction until we acquire the transitionLock.
      let transaction;
      try {
        const driverTransaction =
          await this.driverConnection.startTransaction?.() ??
            this.driverConnection.startTransactionSync?.() ??
            notImplemented("Connection.startTransaction[Sync]");

        transaction = new Transaction(driverTransaction);
      } catch (error) {
        result.reject(error);
        return;
      }
      result.resolve(transaction);

      // Hold transitionLock until the transaction is closed.
      await transaction.closed();
    });
    return result;
  }

  /**
  Prepares a SQL query for execution in this connection without a
  transaction.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async prepareStatement(
    sqlString: string,
  ): Promise<PreparedStatement<Meta, Driver>> {
    return new PreparedStatement(this, sqlString);
  }

  /**
  Closes the connection. If there is an active transaction, this will block
  until it is closed.

  Will not typically throw.
  */
  async close(): Promise<void> {
    await this._transactionLock.dispose();

    this.driverConnection.close
      ? (await this.driverConnection.close())
      : this.driverConnection.closeSync?.();

    this.#closed.resolve();
  }

  /**
  Blocks until the connection is closed.

  Will not typically throw.
  */
  async closed(): Promise<void> {
    return this.#closed;
  }

  #closed = async.deferred<void>();
}

export class Transaction<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  constructor(private driverTransaction: driver.Transaction<Meta>) {}

  /**
  Lock that must be held by the currently-open child transaction.
  */
  _transactionLock = Mutex.marker();

  /**
  Starts a nested transaction within this transaction. If a nested
  transaction is already in progress, this will block until it is closed.
  While a nested transaction is in progress, queries should be executed
  through the inner-most active transaction, not the parent transaction, or
  else they will block until the child transaction is closed.

  May throw DatabaseConnectivityError or DatabaseEngineError.
  */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    const result = async.deferred<Transaction<Meta, Driver>>();
    this._transactionLock.use(async () => {
      // Don't start the transaction until we acquire the transitionLock.
      let transaction;
      try {
        const driverTransaction =
          await this.driverTransaction.startTransaction?.() ??
            this.driverTransaction.startTransactionSync?.() ??
            notImplemented("Transaction.startTransaction[Sync]");

        transaction = new Transaction(driverTransaction);
      } catch (error) {
        result.reject(error);
        return;
      }
      result.resolve(transaction);

      // Hold transitionLock until the transaction is closed.
      await transaction.closed();
    });
    return result;
  }

  /**
  Prepares a SQL query for execution in this transaction.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async prepareStatement(
    query: string,
  ): Promise<PreparedStatement<Meta, Driver>> {
    return notImplemented();
  }

  /**
  Closes the transaction and any open nested transactions with changes
  committed.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async commit(): Promise<void> {
    this.driverTransaction.commit
      ? await this.driverTransaction.commit()
      : this.driverTransaction.commitSync
      ? this.driverTransaction.commitSync()
      : throwMissingImplementation("Transaction.commit[Sync]");
    this.#closed.resolve();
  }

  /**
  Closes the transaction and any open nested transactions with changes
  rolled back.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async rollback(): Promise<void> {
    this.driverTransaction.rollback
      ? await this.driverTransaction.rollback()
      : this.driverTransaction.rollbackSync
      ? this.driverTransaction.rollbackSync()
      : throwMissingImplementation("Transaction.rollback[Sync]");
    this.#closed.resolve();
  }

  /**
  Blocks until the transaction is closed.

  Will not typically throw.
  */
  async closed(): Promise<void> {
    return this.#closed;
  }

  #closed = async.deferred<void>();
}

export class PreparedStatement<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  // Shim implementation, we don't actually use the driver's prepare statement
  // API directly at this time.

  constructor(
    private parent: Transaction<Meta, Driver> | Connection<Meta, Driver>,
    private sqlString: string,
  ) {}

  /**
  Executes the query with an optional array of bound values, and
  incrementally reads rows from the database. The iterators should be
  disposed of by calling `.return()` (which a `for`/`for await` statement
  will do automatically) to release associated resources, or they may hold
  their associated transactions/connections open.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async *query(
    args?: Array<Meta["BoundValue"]>,
  ): AsyncGenerator<Iterator<Meta["ResultValue"]>> {
    const handle = await this.parent._transactionLock.lock();

    notImplemented();

    // TODO: how to ensure this gets invoked if the iterator is closed early
    // TODO: with .return()? I don't think we can using just the generator
    // TODO: interface, we need to implement more.
    handle.release();
  }

  /**
  Executes the query with an optional array of bound values, returning only
  the first row of results, as an array.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async queryRow(
    args?: Array<Meta["BoundValue"]>,
  ): Promise<Array<Meta["ResultValue"]>> {
    return notImplemented();
  }

  /**
  Executes the query with an optional array of bound values, without
  returning any result rows. A `insertedRowId` and `affectedRowCount` value
  may be returned, but note that for some drivers these values may reflect
  a previous query if the executed one did not actually insert or affect any
  rows. (These should only be absent if the driver is certain that they're
  not relevant to the executed query, or doesn't support them at all.)

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async exec(
    args?: Array<Meta["BoundValue"]>,
  ): Promise<{
    insertedRowId?: Meta["ResultValue"];
    affectedRowCount?: number;
  }> {
    return notImplemented();
  }

  /**
  Disposes of this object so that any associated resources can be freed.

  Calling dispose multiple times is allowed, but calling any other method
  after calling dispose will cause a `TypeError`.

  Will not typically throw.
  */
  async dispose(): Promise<void> {
    return notImplemented();
  }
}
