/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 *
 * Inspired by https://golang.org/src/database/sql/driver/driver.go.
 *
 * A class that implements one a type with optional sync and async versions of a
 * methods is expected to implement at least one of those versions.
 */
// deno-lint-ignore-file no-empty-interface

import Context from "../_common/context.ts";
import { Intersection } from "../_common/typing.ts";

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

export interface Driver<Meta extends BaseMeta = BaseMeta> extends
  Intersection<
    Opener<Meta>,
    Partial<IdentifierEncoder<Meta>>
  > {}

/** Types that provide a `.driver`, used for both instances and modules. */
export interface WithDriver<Meta extends BaseMeta = BaseMeta> {
  readonly driver: Driver<Meta>;
}

/** Types that can prepare a Connector for a given database. */
export interface Opener<Meta extends BaseMeta = BaseMeta> {
  open?(
    path: string,
    options?: { context?: Context },
  ): Promise<Connector<Meta>>;
  openSync?(
    path: string,
    options?: { context?: Context },
  ): Connector<Meta>;
}

/** Types that can open a new Connection to a given database. */
export interface Connector<Meta extends BaseMeta = BaseMeta> {
  connect?(
    options?: { context?: Context },
  ): Promise<Connection<Meta>>;
  connectSync?(
    options?: { context?: Context },
  ): Connection<Meta>;
}

/** A database connection. */
export interface Connection<Meta extends BaseMeta = BaseMeta>
  extends
    Intersection<
      StatementPreparer<Meta>,
      TransactionStarter<Meta>,
      Disposable<Meta>
    > {
}

/** A resource that can be disposed (such a connection that can be closed). */
export interface Disposable<Meta extends BaseMeta = BaseMeta> {
  dispose?(): void;
  disposeAsync?(): Promise<void>;
}

export interface Transaction<Meta extends BaseMeta = BaseMeta>
  extends
    Intersection<
      StatementPreparer<Meta>,
      TransactionStarter<Meta>
    > {
  rollback?(): Promise<void>;
  rollbackSync?(): void;

  commit?(): Promise<void>;
  commitSync?(): void;
}

export interface TransactionStarter<Meta extends BaseMeta = BaseMeta> {
  start?(): Promise<Transaction>;
  startSync?(): Transaction;
}

export interface IdentifierEncoder<Meta extends BaseMeta = BaseMeta> {
  encodeIdentifierSync(identifier: string, opts?: {
    context?: "column" | "table" | "database";
    allowInternal?: boolean;
  }): string;
}

export interface StatementPreparer<Meta extends BaseMeta = BaseMeta> {
  prepare?(query: string): Promise<Statement<Meta>>;
  prepareSync?(query: string): Statement<Meta>;
}

export interface Statement<Meta extends BaseMeta = BaseMeta> {
  query?(
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): Rows<Meta>;
  querySync?(
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): RowsSync<Meta>;

  exec?(
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): Promise<ExecResult>;
  execSync?(
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): ExecResult;
}

export interface Rows<Meta extends BaseMeta = BaseMeta> extends
  AsyncIterable<
    Iterable<Meta["Value"]>
  > {}

export interface RowsSync<Meta extends BaseMeta = BaseMeta> extends
  Iterable<
    Iterable<Meta["Value"]>
  > {}

export interface ExecResult {
  rowsAffected: number;
  lastInsertId: number;
}
