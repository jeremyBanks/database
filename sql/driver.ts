// deno-lint-ignore-file no-empty-interface

/** Base type that all driver Meta types must extend. */
export interface MetaBase {
  BoundValue: unknown;
  ResultValue: unknown;
}

/** Default Meta type values for drivers that do not specify them. */
interface MetaDefaults extends MetaBase {
  BoundValue: null | boolean | number | string;
  ResultValue: null | boolean | number | string;
}

/** Helper type function to define a driver Meta type. */
export type Meta<Opts extends Partial<MetaBase>> = {
  [Key in keyof MetaBase]: undefined extends Opts[Key] ? MetaDefaults[Key]
    : Opts[Key];
};

/**
Driver library modules should implicit implement this interface themselves
by exporting an instance of their `Driver` implementation as `.driver`. This
is the entry point through which the other interfaces will be accessed.
*/
export interface Module<Meta extends MetaBase = MetaBase> {
  readonly driver: Driver<Meta>;
}

export interface Driver<Meta extends MetaBase = MetaBase>
  extends ConnectorOpener<Meta> {}

export interface ConnectorOpener<Meta extends MetaBase = MetaBase> {
  /**
  Prepares a connector object that can be used to make connections to a
  database with the given path.

  May throw `DatabaseConnectorValidationError`.
  */
  openConnector?(
    path: string,
  ): Promise<Connector<Meta>>;

  /**
  Prepares a connector object that can be used to make connections to a
  database with the given path.

  May throw `DatabaseConnectorValidationError`.
  */
  openConnectorSync?(
    path: string,
  ): Connector<Meta>;
}

export interface Connector<Meta extends MetaBase = MetaBase> {
  /**
  Returns an open connection to the database.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  connect?(): Promise<Connection<Meta>>;
  /**
  Returns an open connection to the database.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  connectSync?(): Connection<Meta>;
}

export interface Connection<Meta extends MetaBase = MetaBase>
  extends TransactionStarter<Meta>, StatementPreparer<Meta> {
  /**
  Close the connection, blocking until it is closed.

  Must not throw.

  Drivers may assume that no other methods on the Connection will be called
  after close has been called, but close may be called multiple times.
  */
  close?(): Promise<void>;
  /**
  Close the connection.

  Must not throw.

  Drivers may assume that no other methods on the Connection will be called
  after close has been called, but close may be called multiple times.
  */
  closeSync?(): void;

  /**
  Blocks until the connection is closed.

  Must not throw.
  */
  closed?(): Promise<void>;
  /**
  Blocks until the connection is closed.

  Must not throw.
  */
  closedSync?(): void;
}

export interface Transaction<Meta extends MetaBase = MetaBase>
  extends TransactionStarter<Meta>, StatementPreparer<Meta> {
  /**
  Closes this `Transaction` and any child `Transaction`s, with any changes
  committed and saved.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume that no methods on the `Transaction` will be called
  after `commit` has been called.
  */
  commit?(): Promise<void>;
  /**
  Closes this `Transaction` and any child `Transaction`s, with any changes
  committed and saved.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume that no methods on the `Transaction` will be called
  after `commit` has been called.
  */
  commitSync?(): void;

  /**
  Closes the `Transaction` and any child `Transaction`s, with any changes rolled
  back.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume that no methods on the `Transaction` will be called
  after `rollback` has been called.
  */
  rollback?(): Promise<void>;
  /**
  Closes the `Transaction` and any child `Transaction`s, with any changes rolled
  back.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume that no methods on the `Transaction` will be called
  after `rollback` has been called.
  */
  rollbackSync?(): void;
}

export interface TransactionStarter<Meta extends MetaBase = MetaBase> {
  /**
  Starts a new child transaction within this transaction.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume no methods will be called on this object while
  it has an open child transaction, except for `rollback` and `commit` if it is
  a `Transaction` or `close` if it a `Connection`.
  */
  startTransaction?(): Promise<Transaction<Meta>>;
  /**
  Starts a new child transaction within this transaction.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

  Drivers may assume no methods will be called on this object while
  it has an open child transaction, except for `rollback` and `commit` if it is
  a `Transaction` or `close` if it a `Connection`.
  */
  startTransactionSync?(): Transaction<Meta>;
}

export interface StatementPreparer<Meta extends MetaBase = MetaBase> {
  /** Prepares a statement */
  prepare?(
    query: string,
  ): Promise<PreparedStatement<Meta>>;
}

export interface PreparedStatement<Meta extends MetaBase = MetaBase> {
  query?(
    query: string,
    values: Array<Meta["BoundValue"]>,
  ): Promise<ResultRows>;

  /**
  Executes a query, returning the results as an Iterable of Iterable
  rows of ResultValues. These iterables must not be used after the
  associated transaction, if any, has ended.
  */
  querySync?(
    query: string,
    values: Array<Meta["BoundValue"]>,
  ): ResultRows<Meta>;
}

export interface ResultRows<Meta extends MetaBase = MetaBase> {
  /**
  Reads the next row from a query result, or `undefined` if it's exhausted.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  next?(): Promise<ResultRow<Meta> | undefined>;
  /**
  Reads the next row from a query result, or `undefined` if it's exhausted.

  May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  */
  nextSync?(): ResultRow<Meta> | undefined;

  /**
  Close the the result handle, blocking until it is closed.

  Must not throw.

  Drivers may assume that no other methods on the ResultRows will be called
  after close has been called, but close may be called multiple times.
  */
  close?(): Promise<void>;
  /**
  Close the the result handle, blocking until it's closed.

  Must not throw.

  Drivers may assume that no other methods on the ResultRows will be called
  after close has been called, but close may be called multiple times.
  */
  closeSync?(): void;
}

// Note that you can just use an Array to satisfy this interface.

export interface ResultRow<Meta extends MetaBase = MetaBase> extends
  /**
    Iterate over each column value of the row.

    Must not throw. (So this must not require additional engine operations.)
    */
  Iterable<Meta["ResultValue"]> {
  /**
  The number of columns in the row.
  */
  readonly length: number;
}
