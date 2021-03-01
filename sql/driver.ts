/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.

 Inspired by https://golang.org/src/database/sql/driver/driver.go.
*/

// deno-lint-ignore-file no-empty-interface

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
  extends ConnectorOpener<Meta> {}

export interface HasDriver<Meta extends BaseMeta = BaseMeta> {
  readonly driver: Driver<Meta>;
}

export interface ConnectorOpener<Meta extends BaseMeta = BaseMeta> {
  openConnector?(
    path: string,
  ): Promise<Connector<Meta>>;
  openConnectorSync?(
    path: string,
  ): Connector<Meta>;
}

export interface Connector<Meta extends BaseMeta = BaseMeta> {
  /** Opens a new connection to the database. */
  connect?(): Promise<Connection<Meta>>;
  connectSync?(): Connection<Meta>;
}

/** A database connection. */
export interface Connection<Meta extends BaseMeta = BaseMeta>
  extends StatementPreparer<Meta>, TransactionStarter<Meta> {
}

export interface Transaction<Meta extends BaseMeta = BaseMeta>
  extends StatementPreparer<Meta>, TransactionStarter<Meta> {
  rollback?(): Promise<undefined>;
  rollbackSync?(): undefined;

  commit?(): Promise<undefined>;
  commitSync?(): undefined;
}

export interface TransactionStarter<Meta extends BaseMeta = BaseMeta> {
  startTransaction?(): Promise<Transaction<Meta>>;
  startTransactionSync?(): Transaction<Meta>;
}

export interface StatementPreparer<Meta extends BaseMeta = BaseMeta> {
  prepareStatement?(
    query: string,
  ): Promise<PreparedStatement<Meta>>;
  prepareStatementSync?(
    query: string,
  ): PreparedStatement<Meta>;
}

export interface PreparedStatement<Meta extends BaseMeta = BaseMeta>
  extends Queryer<Meta>, Execer<Meta> {}

export interface Queryer<Meta extends BaseMeta = BaseMeta> {
  query?(
    values: Array<Meta["Value"]>,
  ): Rows<Meta>;
  querySync?(
    values: Array<Meta["Value"]>,
  ): RowsSync<Meta>;
}

export interface Execer<Meta extends BaseMeta = BaseMeta> {
  exec?(
    values: Array<Meta["Value"]>,
  ): Promise<ExecResult<Meta>>;
  execSync?(
    values: Array<Meta["Value"]>,
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

export interface Query<
  Meta extends BaseMeta = BaseMeta,
  Args extends Array<Meta["Value"]> = Array<Meta["Value"]>,
> {
  readonly sql: string;
  readonly args: Args;
}
