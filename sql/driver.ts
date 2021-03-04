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
  extends TransactionStarter<Meta>, Queryer<Meta> {
  /**
  The primary key of the last row inserted through this connection. If the
  last query did not insert a row, the result of this method may be a stale
  value or `undefined`.

  May throw `DatabaseConnectivityError`.
  */
  lastInsertedId?(): Promise<Meta["ResultValue"] | undefined>;
  /**
  The primary key of the last row inserted through this connection. If the
  last query did not insert a row, the result of this method may be a stale
  value or `undefined`.

  May throw `DatabaseConnectivityError`.
  */
  lastInsertedIdSync?(): Meta["ResultValue"] | undefined;

  /**
  The number of rows affected by the last query through this connection. If
  the last query was of a type that could not affect any rows, the result of
  this method may be a stale value or undefined.

  May throw `DatabaseConnectivityError`.
  */
  affectedRows?(): Promise<number | undefined>;
  /**
  The number of rows affected by the last query through this connection. If
  the last query was of a type that could not affect any rows, the result of
  this method may be a stale value or undefined.

  May throw `DatabaseConnectivityError`.
  */
  affectedRowsSync?(): number | undefined;

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
  extends TransactionStarter<Meta>, Queryer<Meta> {
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

export interface Queryer<Meta extends MetaBase = MetaBase> {
  /**
  Executes a query, returning the results as an AsyncIterable of Iterable
  rows of ResultValues. These iterables must not be used after the
  associated transaction, if any, has ended.
  */
  query?(
    query: string,
    values: Array<Meta["BoundValue"]>,
  ): AsyncIterable<Iterable<Meta["ResultValue"]>>;
  /**
  Executes a query, returning the results as an Iterable of Iterable
  rows of ResultValues. These iterables must not be used after the
  associated transaction, if any, has ended.
  */
  querySync?(
    query: string,
    values: Array<Meta["BoundValue"]>,
  ): Iterable<Iterable<Meta["ResultValue"]>>;
}
