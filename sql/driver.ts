// Package driver defines interfaces to be implemented by database drivers as used by package `x/database/sql`.

// Helpers for declaring and reading type-only metadata for a driver.

// const DriverMetaKey = Symbol("DriverMetaKey");
// type DriverMetaKey = typeof DriverMetaKey;

// export type WithMeta<T, Meta extends DriverMeta> =
//   Omit<T, DriverMetaKey> & {[DriverMetaKey]: Meta}

// export type GetMeta<
//   T extends { [DriverMetaKey]: DriverMeta },
//   name extends keyof T[DriverMetaKey],
// > = T[DriverMetaKey][name];

export interface DriverMetaBase {
  sqlDialectName: string | "sqlite" | "mysql" | "postgresql" | "tsql",
  Value: unknown,
};

interface DriverMetaDefaults extends DriverMetaBase {
  sqlDialectName: any,
  Value: null | boolean | number | string,
};

export type DriverMeta<Opts extends Partial<DriverMetaBase>> = {
  [Key in keyof DriverMetaBase]:
    undefined extends Opts[Key] ? DriverMetaDefaults[Key] : Opts[Key]
} & {
  [UnexpectedKey in string & Exclude<keyof Opts, keyof DriverMetaBase>]: `WARNING: Invalid DriverMeta option: ${UnexpectedKey}`
};

export type SqliteDriverMeta = DriverMeta<{
  sqlDialectName: 'sqlite',
  Value: null | boolean | number | string | bigint | Uint8Array,
}>

export interface Query<Meta extends DriverMetaBase> {
  query: string,
  args?: Array<Meta["Value"]>;
}

export interface QueryNamed<Meta extends DriverMetaBase> {
  query: string,
  opts?: Record<string, Meta["Value"]>
}

export interface Driver<Meta extends DriverMetaBase = DriverMetaBase> extends
  Opener<Meta>,
  Partial<
    & Queryer<Meta>
  > {};

export interface Opener<Meta extends DriverMetaBase = DriverMetaBase> {

}

export type Queryer<Meta extends DriverMetaBase = DriverMetaBase> = {
  query(query: Query<Meta>): null
};

// export type Opener = {

// };

// // & Partial<Queryer>;

// export type DefaultValue = null | number | string;
