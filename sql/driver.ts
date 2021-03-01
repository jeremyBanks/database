// deno-lint-ignore-file no-empty-interface

export interface BaseMeta {
  BoundValue: unknown;
  ResultValue: unknown;
}

interface MetaDefaults extends BaseMeta {
  BoundValue: null | boolean | number | string;
  ResultValue: null | boolean | number | string;
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
  connect?(): Promise<Connection<Meta>>;
  connectSync?(): Connection<Meta>;
}

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
    values: Array<Meta["BoundValue"]>,
  ): Rows<Meta>;
  querySync?(
    values: Array<Meta["BoundValue"]>,
  ): RowsSync<Meta>;
}

export interface Execer<Meta extends BaseMeta = BaseMeta> {
  exec?(
    values: Array<Meta["BoundValue"]>,
  ): Promise<ExecResult<Meta>>;
  execSync?(
    values: Array<Meta["BoundValue"]>,
  ): ExecResult<Meta>;
}

export interface Rows<Meta extends BaseMeta = BaseMeta>
  extends AsyncIterable<Iterable<Meta["ResultValue"]>> {}

export interface RowsSync<Meta extends BaseMeta = BaseMeta>
  extends Iterable<Iterable<Meta["ResultValue"]>> {}

export interface ExecResult<Meta extends BaseMeta = BaseMeta> {
  readonly rowsAffected: number | null;
  readonly lastInsertId: Meta["ResultValue"];
}

export interface Query<
  Meta extends BaseMeta = BaseMeta,
  Args extends Array<Meta["BoundValue"]> = Array<Meta["BoundValue"]>,
> {
  readonly sql: string;
  readonly args: Args;
}
