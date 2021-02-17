/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 * 
 * Inspired by https://golang.org/src/database/sql/driver/driver.go.
 */

import Context from "../_common/context.ts";

export interface BaseMeta {
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
}

export interface Driver<Meta extends BaseMeta = BaseMeta> extends
  Partial<
    & Opener<Meta>
    & OpenerSync<Meta>
    & IdentifierEncoder<Meta>
  > {}

export interface Opener<Meta extends BaseMeta = BaseMeta> {
  open(path: string, options: { context: Context }): Promise<Connection<Meta>>;
}
export type OpenerSync<Meta extends BaseMeta = BaseMeta> = Sync<Opener<Meta>>;

export type Connection<Meta extends BaseMeta = BaseMeta> =
  & WithDriver<Meta>
  & Partial<
    & Queryer<Meta>
    & QueryerSync<Meta>
  >;

export type Rows<Meta extends BaseMeta = BaseMeta> = Iterable<
  Iterable<Meta["Value"]>
>;
export type AsyncRows<Meta extends BaseMeta = BaseMeta> = AsyncIterable<
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
  sqlDialectName: any;
  Value: null | boolean | number | string;
  SourceName: string;
} /** Used internally to generate *Sync variants of async interfaces. */

// deno-fmt-ignore (due to a current bug that deletes the `as` clause)
type Sync<T> = {
  [K in string & keyof T as `${K}Sync`]: T[K] extends
    (...args: infer Args) => AsyncRows<infer Result>
    ? ((...args: Args) => Rows<Result>)
    : T[K] extends (...args: infer Args) => Promise<infer Result>
      ? ((...args: Args) => Result)
    : T[K] extends (...args: infer Args) => AsyncIterable<infer Result>
      ? ((...args: Args) => Iterable<Result>)
    : never;
};

export type Supporting<T> = (Driver & T) | (Driver & Sync<T>);

export interface Preparer<Meta extends BaseMeta = BaseMeta> {
  prepare(query: string): Statement<Meta>;
}

export interface Statement<Meta extends BaseMeta = BaseMeta> {
  query(values: Array<Meta["Value"]>): AsyncRows<Meta>;
}

export interface Queryer<Meta extends BaseMeta = BaseMeta> {
  query(
    query: string,
    values: Array<Meta["Value"]>,
    options: { context: Context },
  ): AsyncRows<Meta>;
}

export type QueryerSync<Meta extends BaseMeta = BaseMeta> = Sync<Queryer<Meta>>;

export type Meta<Opts extends Partial<BaseMeta>> = {
  [Key in keyof BaseMeta]: undefined extends Opts[Key] ? MetaDefaults[Key]
    : Opts[Key];
};
