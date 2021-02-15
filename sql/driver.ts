/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 */

export interface MetaBase {
  /** The name of the SQL dialect being used, as a lowercase string.
    * This should not vary across different drivers for the same server.
    */
  sqlDialectName: string | "sqlite" | "mysql" | "postgresql" | "tsql";
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
  /** May be used if the driver wants to restrict source to a string subtype. */
  SourceName: string;
}

export type meta<D> = D extends Driver<infer M> ? M : never;

interface MetaDefaults extends MetaBase {
  sqlDialectName: any;
  Value: null | boolean | number | string;
  SourceName: string;
}

export type Meta<Opts extends Partial<MetaBase>> =
  & {
    [Key in keyof MetaBase]: undefined extends Opts[Key]
      ? MetaDefaults[Key]
      : Opts[Key];
  }
  & (
    & {
      [UnexpectedKey in string & Exclude<keyof Opts, keyof MetaBase>]:
        `Invalid Meta option: ${UnexpectedKey}`;
    }
    & any
  );

export interface Query<Meta extends MetaBase> {
  query: string;
  args?: Array<Meta["Value"]>;
}

export type driver<Opts extends Partial<MetaBase>> = Driver<Meta<Opts>>;

// OHHH

// this is not something drivers need to be aware of!

// except in as much as it needs to use an interpolation syntax that's
// compatible with a given driver... but maybe ? is compatible with all of them?

export interface QueryNamed<Meta extends MetaBase> {
  query: string;
  opts?: Record<string, Meta["Value"]>;
}

export interface Driver<Meta extends MetaBase = MetaBase>
  extends
    Partial<
      & Opener<Meta>
      & OpenerSync<Meta>
      & Queryer<Meta>
      & QueryerSync<Meta>
      & IdentifierEncoder<Meta>
    > {}

export interface Connection<Meta extends MetaBase = MetaBase> {
}

export class Connection {
}

export interface Opener<Meta extends MetaBase = MetaBase> {
  open(path: string): Promise<Connection<Meta>>;
}

export interface OpenerSync<Meta extends MetaBase = MetaBase> {
  openSync(path: string): void; //ConnectionSync<Meta>;
}

export type Queryer<Meta extends MetaBase = MetaBase> = {
  query(query: Query<Meta>): null;
};

// export type Opener = {

// };

// // & Partial<Queryer>;

// export type DefaultValue = null | number | string;
