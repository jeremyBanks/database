/** @fileoverview Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.
 */

export interface DriverMetaBase {
  /** The name of the SQL dialect being used, as a lowercase string.
    * This should not vary across different drivers for the same server.
    */
  sqlDialectName: string | "sqlite" | "mysql" | "postgresql" | "tsql";
  /** The allowed types for Values passed into or returned from this driver. */
  Value: unknown;
  /** May be used if the driver wants to restrict source to a string subtype. */
  SourceName: string;
}

interface DriverMetaDefaults extends DriverMetaBase {
  sqlDialectName: any;
  Value: null | boolean | number | string;
  SourceName: string;
}

export type DriverMeta<Opts extends Partial<DriverMetaBase>> =
  & {
    [Key in keyof DriverMetaBase]: undefined extends Opts[Key]
      ? DriverMetaDefaults[Key]
      : Opts[Key];
  }
  & (
    & {
      [UnexpectedKey in string & Exclude<keyof Opts, keyof DriverMetaBase>]:
        `Invalid DriverMeta option: ${UnexpectedKey}`;
    }
    & any
  );

export interface Query<Meta extends DriverMetaBase> {
  query: string;
  args?: Array<Meta["Value"]>;
}

// OHHH

// this is not something drivers need to be aware of!

// except in as much as it needs to use an interpolation syntax that's
// compatible with a given driver... but maybe ? is compatible with all of them?

export interface QueryNamed<Meta extends DriverMetaBase> {
  query: string;
  opts?: Record<string, Meta["Value"]>;
}

export interface Driver<Meta extends DriverMetaBase = DriverMetaBase>
  extends
    Partial<
      & Opener<Meta>
      & OpenerSync<Meta>
      & Queryer<Meta>
    > {}

export default new class Sqlite implements
  Driver<
    DriverMeta<{
      sqlDialectName: "sqlite";
      Value: null | boolean | number | string | bigint | Uint8Array;
    }>
  > {
  async open(_path: string) {
    return new Connection();
  }
}();

export interface Connection<Meta extends DriverMetaBase = DriverMetaBase> {
}

export class Connection {
}

export interface Opener<Meta extends DriverMetaBase = DriverMetaBase> {
  open(path: string): Promise<Connection<Meta>>;
}

export interface OpenerSync<Meta extends DriverMetaBase = DriverMetaBase> {
  openSync(path: string): void; //ConnectionSync<Meta>;
}

export type Queryer<Meta extends DriverMetaBase = DriverMetaBase> = {
  query(query: Query<Meta>): null;
};

// export type Opener = {

// };

// // & Partial<Queryer>;

// export type DefaultValue = null | number | string;
