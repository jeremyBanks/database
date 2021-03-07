// deno-lint-ignore-file require-await require-yield

import { notImplemented } from "../_common/assertions.ts";
import { Context } from "../_common/context.ts";
import { async } from "../_common/deps.ts";
import { Mutex } from "../_common/mutex.ts";

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
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverConnector: driver.Connector<Meta>,
    context: Context = Context.Background,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

  /**
  Opens a new open connection to the database.

  May throw DatabaseConnectivityError or DatabaseEngineError.
  */
  async connect(): Promise<Connection<Meta, Driver>> {
    this.context.throwIfDone();

    const driverConnection = await this.driverConnector.connect?.() ??
      this.driverConnector.connectSync?.() ??
      throwMissingImplementation("Connector.connect[Sync]");

    this.context.throwIfDone();

    const connection = new Connection<Meta, Driver>(
      driverConnection,
      this.context,
    );

    return connection;
  }

  dispose() {
    this.contextCloser();
  }
}

export class Connection<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverConnection: driver.Connection<Meta>,
    context: Context,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

  /**
  Lock that must be held by the currently-open child transaction or operation.
  */
  private operationLock = new Mutex(this);

  /**
  Starts a new transaction in the connection. If if there is an already an
  active transaction in progress on this connection, this will block until
  it is closed.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    const result = async.deferred<Transaction<Meta, Driver>>();
    this.operationLock.use(async () => {
      // Don't start the transaction until we acquire the transitionLock.
      let transaction;
      try {
        const driverTransaction =
          await this.driverConnection.startTransaction?.() ??
            this.driverConnection.startTransactionSync?.() ??
            throwMissingImplementation("Connection.startTransaction[Sync]");

        transaction = new Transaction(
          this.driverConnection,
          driverTransaction,
          this.context,
        );
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
    this.context.throwIfDone();
    return new PreparedStatement(
      this.driverConnection,
      undefined,
      this.operationLock,
      sqlString,
      this.context,
    );
  }

  /**
  Closes the connection.

  Will not typically throw.
  */
  async close(): Promise<void> {
    this.driverConnection.close
      ? (await this.driverConnection.close())
      : this.driverConnection.closeSync?.();

    this.contextCloser();

    await this.operationLock.dispose();
  }

  /**
  Blocks until the connection is closed.

  Will not typically throw.
  */
  async closed(): Promise<void> {
    await this.context.done();
  }
}

export class Transaction<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverConnection: driver.Connection<Meta>,
    private driverTransaction: driver.Transaction<Meta>,
    context: Context,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

  /**
  Lock that must be held by the currently-open child transaction or operation.
  */
  private operationLock = new Mutex(this);

  /**
  Starts a nested transaction within this transaction. If a nested
  transaction is already in progress, this will block until it is closed.
  While a nested transaction is in progress, queries should be executed
  through the inner-most active transaction, not the parent transaction, or
  else they will block until the child transaction is closed.

  May throw DatabaseConnectivityError or DatabaseEngineError.
  */
  async startTransaction(): Promise<Transaction<Meta, Driver>> {
    this.context.throwIfDone();

    const result = async.deferred<Transaction<Meta, Driver>>();
    this.operationLock.use(async () => {
      // Don't start the transaction until we acquire the transitionLock.

      this.context.throwIfDone();

      let transaction;
      try {
        const driverTransaction =
          await this.driverTransaction.startTransaction?.() ??
            this.driverTransaction.startTransactionSync?.() ??
            throwMissingImplementation("Transaction.startTransaction[Sync]");

        transaction = new Transaction(
          this.driverConnection,
          driverTransaction,
          this.context,
        );
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
    sqlString: string,
  ): Promise<PreparedStatement<Meta, Driver>> {
    return new PreparedStatement(
      this.driverConnection,
      this.driverTransaction,
      this.operationLock,
      sqlString,
      this.context,
    );
  }

  /**
  Closes the transaction and any open nested transactions with changes
  committed.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async commit(): Promise<void> {
    this.context.throwIfDone();

    this.driverTransaction.commit
      ? await this.context.cancelling(this.driverTransaction.commit())
      : this.driverTransaction.commitSync
      ? this.driverTransaction.commitSync()
      : throwMissingImplementation("Transaction.commit[Sync]");
    this.closedDeferred.resolve();
  }

  /**
  Closes the transaction and any open nested transactions with changes
  rolled back.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async rollback(): Promise<void> {
    this.context.throwIfDone();

    this.driverTransaction.rollback
      ? await this.context.cancelling(this.driverTransaction.rollback())
      : this.driverTransaction.rollbackSync
      ? this.driverTransaction.rollbackSync()
      : throwMissingImplementation("Transaction.rollback[Sync]");
    this.closedDeferred.resolve();
  }

  /**
  Blocks until the transaction is closed.

  Will not typically throw.
  */
  async closed(): Promise<void> {
    return this.closedDeferred;
  }

  closedDeferred = async.deferred<void>();
}

export class PreparedStatement<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> {
  // Shim implementation, we don't actually use the driver's prepare statement
  // API directly at this time.
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverConnection: driver.Connection<Meta>,
    private driverTransaction: driver.Transaction<Meta> | undefined,
    private operationLock: Mutex<Record<never, never>>,
    private sqlString: string,
    context: Context,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

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
  ): AsyncGenerator<Iterable<Meta["ResultValue"]>> {
    this.context.throwIfDone();
    const handle = await this.operationLock.lock();

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
  ): Promise<Array<Meta["ResultValue"]> | undefined> {
    this.context.throwIfDone();
    for await (const row of this.query(args)) {
      this.context.throwIfDone();
      return [...row];
    }
    this.context.throwIfDone();
    return undefined;
  }

  /**
  Executes the query with an optional array of bound values, without
  returning any result rows. A `insertedRowId` and `affectedRows` value
  may be returned, but note that for some drivers these values may reflect
  a previous query if the executed one did not actually insert or affect any
  rows. (These should only be absent if the driver is certain that they're
  not relevant to the executed query, or doesn't support them at all.)

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  async exec(
    args?: Array<Meta["BoundValue"]>,
  ): Promise<{
    lastInsertedId?: Meta["ResultValue"];
    affectedRows?: number;
  }> {
    this.context.throwIfDone();
    const result = this.query(args);
    const lastInsertedId = this.driverConnection.lastInsertedId
      ? await this.context.cancelling(this.driverConnection.lastInsertedId())
      : this.driverConnection.lastInsertedIdSync
      ? this.driverConnection.lastInsertedIdSync()
      : throwMissingImplementation("Connection.lastInsertedId[Sync]");
    const affectedRows = this.driverConnection.affectedRows
      ? await this.context.cancelling(this.driverConnection.affectedRows())
      : this.driverConnection.affectedRowsSync
      ? this.driverConnection.affectedRowsSync()
      : throwMissingImplementation("Connection.affectedRows[Sync]");

    // This will release the operation lock, so it needs to come after we read
    // the above stats for our query.
    result.return(undefined);

    return {
      lastInsertedId,
      affectedRows,
    };
  }

  /**
  Disposes of this object so that any associated resources can be freed.

  Calling dispose multiple times is allowed, but calling any other method
  after calling dispose will cause a `TypeError`.

  Will not typically throw.
  */
  async dispose(): Promise<void> {
    this.contextCloser();
  }
}

export class ResultRows<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> implements AsyncIterable<Meta["ResultValue"]> {
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverRows: driver.ResultRows<Meta>,
    context: Context,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

  async close(): Promise<void> {
    this.driverRows.close
      ? (await this.driverRows.close())
      : this.driverRows.closeSync?.();

    this.contextCloser();
  }

  [Symbol.asyncIterator](): AsyncIterator<ResultRow<Meta, Driver>, void> {
    this.context.throwIfDone();
    return {
      next: async () => {
        this.context.throwIfDone();

        const driverRow = await this.driverRows.next?.() ??
          this.driverRows.nextSync?.() ??
          throwMissingImplementation("ResultRows.next[Sync]");
        if (driverRow !== undefined) {
          const row = new ResultRow<Meta, Driver>(driverRow);
          return {
            done: false,
            value: row,
          };
        } else {
          return {
            done: true,
            value: undefined,
          };
        }
      },

      return: async () => {
        this.context.throwIfDone();

        await this.close();
        return {
          done: true,
          value: undefined,
        };
      },
    };
  }
}

export class ResultRow<
  Meta extends driver.MetaBase,
  Driver extends driver.Driver<Meta>,
> implements Iterable<Meta["ResultValue"]> {
  readonly context: Context;
  private contextCloser: () => void;

  constructor(
    private driverRow: driver.ResultRow<Meta>,
    context: Context,
  ) {
    [this.context, this.contextCloser] = context.withCancel();
  }

  toArray(): Array<Meta["ResultValue"]> {
    this.context.throwIfDone();
    return [...this];
  }

  [Symbol.iterator]() {
    this.context.throwIfDone();
    return this.driverRow[Symbol.iterator]();
  }

  get length() {
    this.context.throwIfDone();
    return this.driverRow.length;
  }
}
