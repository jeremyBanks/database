/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 */

export interface BaseMeta {
  /** The name of the SQL dialect being used, as a lowercase string.
    * This should not vary across different drivers for the same server.
    */
  sqlDialectName: string | "sqlite" | "mysql" | "postgresql" | "tsql";
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
  /** May be used if the driver wants to restrict source to a string subtype. */
  SourceName: string;
}

export interface Driver<Meta extends BaseMeta = BaseMeta> extends
  Partial<
    & Opener<Meta>
    & OpenerSync<Meta>
    & IdentifierEncoder<Meta>
  > {}

export interface Opener<Meta extends BaseMeta = BaseMeta> {
  open(path: string): Promise<Connection<Meta>>;
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

type Sync<T> = {
  [K in string & keyof T]: T[K] extends
    (...args: infer Args) => AsyncRows<infer Result>
    ? ((...args: Args) => Rows<Result>)
    : T[K] extends (...args: infer Args) => Promise<infer Result>
      ? ((...args: Args) => Result)
    : T[K] extends (...args: infer Args) => AsyncIterable<infer Result>
      ? ((...args: Args) => Iterable<Result>)
    : never;
};

export interface Queryer<Meta extends BaseMeta = BaseMeta> {
  query(query: string, values: Array<Meta["Value"]>): AsyncRows<Meta>;
}

export type QueryerSync<Meta extends BaseMeta = BaseMeta> = Sync<Queryer<Meta>>;

export type Meta<Opts extends Partial<BaseMeta>> =
  & {
    [Key in keyof BaseMeta]: undefined extends Opts[Key] ? MetaDefaults[Key]
      : Opts[Key];
  }
  & (
    & {
      [UnexpectedKey in string & Exclude<keyof Opts, keyof BaseMeta>]:
        `Invalid driver.Meta option: ${UnexpectedKey}`;
    }
    & any
  );
