/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 *
 * Inspired by https://golang.org/src/database/sql/driver/driver.go.
 */

import Context from "../_common/context.ts";

export interface BaseMeta {
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
}

// deno-lint-ignore no-empty-interface
export interface Driver<Meta extends BaseMeta = BaseMeta> extends
  Partial<
    & Opener<Meta>
    & OpenerSync<Meta>
    & IdentifierEncoder<Meta>
  > {}

export interface Opener<Meta extends BaseMeta = BaseMeta> {
  open(
    path: string,
    options?: { context?: Context },
  ): Promise<Connection<Meta>>;
}

export interface OpenerSync<Meta extends BaseMeta = BaseMeta> {
  openSync(path: string, options?: { context?: Context }): Connection<Meta>;
}

export type Connection<Meta extends BaseMeta = BaseMeta> =
  & WithDriver<Meta>
  & Partial<
    & Queryer<Meta>
    & QueryerSync<Meta>
  >;

export type RowsSync<Meta extends BaseMeta = BaseMeta> = Iterable<
  Iterable<Meta["Value"]>
>;
export type Rows<Meta extends BaseMeta = BaseMeta> = AsyncIterable<
  Iterable<Meta["Value"]>
>;

export type WithDriver<Meta extends BaseMeta = BaseMeta> = {
  driver: Driver<Meta>;
};

export interface IdentifierEncoder<Meta extends BaseMeta = BaseMeta> {
  encodeIdentifier(identifier: string, opts?: {
    context?: "column" | "table" | "database";
    allowWeird?: boolean;
    allowInternal?: boolean;
  }): string;
}

interface MetaDefaults extends BaseMeta {
  Value: null | boolean | number | string;
  SourceName: string;
}

export interface Queryer<Meta extends BaseMeta = BaseMeta> {
  query(
    query: string,
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): Rows<Meta>;
}

export interface QueryerSync<Meta extends BaseMeta = BaseMeta> {
  querySync(
    query: string,
    values: Array<Meta["Value"]>,
    options?: { context?: Context },
  ): RowsSync<Meta>;
}

export type Meta<Opts extends Partial<BaseMeta>> = {
  [Key in keyof BaseMeta]: undefined extends Opts[Key] ? MetaDefaults[Key]
    : Opts[Key];
};
