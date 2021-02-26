/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 *
 * Inspired by https://golang.org/src/database/sql/driver/driver.go.
 *
 * A class that implements one a type with optional sync and async versions of a
 * methods is expected to implement at least one of those versions.
 */

// deno-lint-ignore-file no-empty-interface

import Context from "../_common/context.ts";

/** Type metadata associated with a driver. */
export interface BaseMeta {
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
}

interface MetaDefaults extends BaseMeta {
  Value: null | boolean | number | string;
}

export type Meta<Opts extends Partial<BaseMeta>> = {
  [Key in keyof BaseMeta]: undefined extends Opts[Key] ? MetaDefaults[Key]
    : Opts[Key];
};

export interface Driver<Meta extends BaseMeta = BaseMeta>
  extends ConnectorOpener<Meta>, Partial<IdentifierEncoder<Meta>> {}

export interface HasDriver<Meta extends BaseMeta = BaseMeta> {
  readonly driver: Driver<Meta>;
}

/** A type that may provide a .dispose() method that may be called to
  * reclaim any associated resources once it is no longer going to be used.
  * Redundant calls to .dispose() should have no effect. */
export interface Disposer {
  dispose?(): void | Promise<void>;
}

export interface ConnectorOpener<Meta extends BaseMeta = BaseMeta> {
  /** Prepares a connector for the database. May validate arguments, but must not
    * actually connect. */
  openConnector?(
    path: string,
    options: { context: Context },
  ): Promise<Connector<Meta>>;
  openConnectorSync?(
    path: string,
    options: { context: Context },
  ): Connector<Meta>;
}
export interface Connector<Meta extends BaseMeta = BaseMeta> {
  /** Opens a new connection to the database. */
  connect?(
    options: { context: Context },
  ): Promise<Connection<Meta>>;
  connectSync?(
    options: { context: Context },
  ): Connection<Meta>;
}

/** A database connection. */
export interface Connection<Meta extends BaseMeta = BaseMeta>
  extends StatementPreparer<Meta>, TransactionStarter<Meta>, Disposer {
}

export interface Transaction<Meta extends BaseMeta = BaseMeta>
  extends StatementPreparer<Meta>, TransactionStarter<Meta>, Disposer {
  rollback?(
    options: { context: Context },
  ): Promise<undefined>;
  rollbackSync?(
    options: { context: Context },
  ): undefined;

  commit?(
    options: { context: Context },
  ): Promise<undefined>;
  commitSync?(
    options: { context: Context },
  ): undefined;
}

export interface TransactionStarter<Meta extends BaseMeta = BaseMeta> {
  /** Starts a new transaction. The parent transaction/connect should not be
    * used again until this transaction is closed. */
  startTransaction?(
    options: { context: Context },
  ): Promise<Transaction<Meta>>;
  startTransactionSync?(
    options: { context: Context },
  ): Transaction<Meta>;
}

export interface IdentifierEncoder<Meta extends BaseMeta = BaseMeta> {
  /** Safe encoding of dynamic identifiers for use in SQL expressions.
    * Drivers that do not implement this will fall back to a default
    * implementation that only allows simple identifiers that do not require
    * potentially implementation-dependent encoding logic. */
  encodeIdentifierSync(identifier: string, opts: {
    /** If allowInternal is false the implementation SHOULD throw an error if
      * an internal database table name (such as `table_schema` in PostgreSQL or
      * `sqlite_master` in SQLite), if possible.
     */
    allowInternal: boolean;
  }): string;
}

export interface StatementPreparer<Meta extends BaseMeta = BaseMeta> {
  /** Prepares a statement for execution. The statement is expected to be used
    * within the current transaction transaction (not including its children).
    * It may be disposed and invalid after its transaction is finished. */
  prepareStatement?(
    query: string,
    options: { context: Context },
  ): Promise<PreparedStatement<Meta>>;
  prepareStatementSync?(
    query: string,
    options: { context: Context },
  ): PreparedStatement<Meta>;
}

export interface PreparedStatement<Meta extends BaseMeta = BaseMeta>
  extends Queryer<Meta>, Execer<Meta>, Disposer {}

export interface Queryer<Meta extends BaseMeta = BaseMeta> {
  query?(
    values: Array<Meta["Value"]>,
    options: { context: Context },
  ): Rows<Meta>;
  querySync?(
    values: Array<Meta["Value"]>,
    options: { context: Context },
  ): RowsSync<Meta>;
}

export interface Execer<Meta extends BaseMeta = BaseMeta> {
  exec?(
    values: Array<Meta["Value"]>,
    options: { context: Context },
  ): Promise<ExecResult<Meta>>;
  execSync?(
    values: Array<Meta["Value"]>,
    options: { context: Context },
  ): ExecResult<Meta>;
}

export interface Rows<Meta extends BaseMeta = BaseMeta>
  extends AsyncIterable<Iterable<Meta["Value"]>> {}

export interface RowsSync<Meta extends BaseMeta = BaseMeta>
  extends Iterable<Iterable<Meta["Value"]>> {}

export interface ExecResult<Meta extends BaseMeta = BaseMeta> {
  readonly rowsAffected: number | null;
  readonly lastInsertId: Meta["Value"];
}
