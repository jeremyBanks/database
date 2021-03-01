# x/database/sql for Deno, Version 0.1

**Date:** February 28, 2021

**Status:**
[Your comments are requested!](https://github.com/jeremyBanks/database/pull/3)

## Background

Deno currently has several great driver libraries for different database
engines. However, each one provides a slightly different interface, with a
slightly different set of functionality, creating friction for users who want to
write code that works across database engines. This is similar to the position
that Go was in that led to the creation of their `database/sql` library. Deno
isn't exactly the same as Go, but they have a lot in common. With some changes,
we can take Go's API design and their
["Goals of the `sql` and `sql/driver`
packages"](https://golang.org/src/database/sql/doc.txt) document (below) as a
starting point for our own library:

> - Provide a generic database API for a variety of SQL or SQL-like databases.
  > There currently exist Go libraries for SQLite, MySQL, and Postgres, but all
  > with a very different feel, and often a non-Go-like feel.
> - Feel like Go.
> - Care mostly about the common cases. Common SQL should be portable. SQL edge
  > cases or db-specific extensions can be detected and conditionally used by
  > the application. It is a non-goal to care about every particular db's
  > extension or quirk.
> - Separate out the basic implementation of a database driver (implementing the
  > `sql/driver` interfaces) vs the implementation of all the user-level types
  > and convenience methods. In a nutshell:<br> User Code &rarr; `sql` package
  > (concrete types) &rarr; `sql/driver` (interfaces)<br> Database Driver &rarr;
  > `sql` (to register) + `sql/driver` (implement interfaces)
> - Make type casting/conversions consistent between all drivers. To achieve
  > this, most of the conversions are done in the `sql` package, not in each
  > driver. The drivers then only have to deal with a smaller set of types.
> - Be flexible with type conversions, but be paranoid about silent truncation
  > or other loss of precision.
> - Handle concurrency well. Users shouldn't need to care about the database's
  > per-connection thread safety issues (or lack thereof), and shouldn't have to
  > maintain their own free pools of connections. The `sql` package should deal
  > with that bookkeeping as needed. Given an `*sql.DB`, it should be possible
  > to share that instance between multiple goroutines, without any extra
  > synchronization.
> - Push complexity, where necessary, down into the `sql`+`driver` packages,
  > rather than exposing it to users. Said otherwise, the `sql` package should
  > expose an ideal database that's not finnicky about how it's accessed, even
  > if that's not true.
> - Provide optional interfaces in `sql/driver` for drivers to implement for
  > special cases or fastpaths. But the only party that knows about those is the
  > sql package. To user code, some stuff just might start working or start
  > working slightly faster.

## Goals

For this initial v0.1 release, we would like to provide the minimal set of core
capabilities that are enough to be useful, even if they may not be as
comprehensive, flexible, efficient, or convenient as we'd like.

Prior to v1.0, we do not make any guarantees about API stability
([as per semver](https://semver.org/spec/v2.0.0.html#spec-item-4)), but we
should still be thoughtful and try to avoid unnecessary breakage.

## Database Driver API (`x/database/sql/driver.ts`)

Inspired by [`driver.go`](https://golang.org/src/database/sql/driver/driver.go),
`./driver.ts` exports interfaces for database driver libraries to implement for
interoperability with `./sql.ts`'s user interface. **Most users should have no
reason to use these interfaces directly.** Note that drivers do not "register"
themselves with this library as they do in with the Go library.

Many of these interfaces define methods in both optional async and sync
variants, such as `connect?(): Promise<Connection>` and
`connectSync?(): Connection`. In these cases, drivers may choose to implement
one or both variations of each method.

- `driver.WithDriver` interface
  - `.driver: Driver`
  - Driver library modules should implement this interface themselves by
    exporting an instance of their `Driver` implementation as `.driver`. This is
    the entry point through which the other interfaces will be accessed.
    ```ts
    // driver
    import * as driver from "/x/database/sql/driver.ts";
    class MysqliteDriver implements driver.Driver { … };
    const mysqliteDriver = new MysqliteDriver();
    export { mysqliteDriver as driver };
    ```
    ```ts
    // consumer
    import * as sql from "/x/database/sql/sql.ts";
    import * as mysqlite from "./mysqlite.ts";
    const connector = await sql.open("mysqlite:127.0.0.1:8090", mysqlite);
    ```
- `driver.Driver` interface
  - extends `driver.ConnectorOpener`
- `driver.ConnectorOpener` interface
  - `.open[Sync](path: string): driver.Connector`
    - Prepares a connector object that can be used to make connections to a
      database with the given path.
- `driver.Connector` interface
  - `.connect[Sync](): driver.Connection`
    - Returns a new connection to the database.
- `driver.Connection` interface
  - `.startTransaction[Sync](): driver.Transaction`
    - Starts a new transaction within in the connection.
  - `.lastInsertedId[Sync](): Value | undefined`
    - The primary key of the last row inserted through this connection. If the
      last query did not insert a row, the result of this method may be a stale
      value or `undefined`.
  - `.affectedRows[Sync](): number | undefined`
    - The number of rows affected by the last query through this connection. If
      the last query was of a type that could not affect any rows, the result of
      this method may be a stale value or `undefined`.
  - `.close[Sync]()`
    - close the connection.
- `driver.Transaction` interface
  - `.query[Sync](sql: string, arguments?: Array<Value>): AsyncIterable<Iterable<Value>>`
    - Executes a query against the database in the context of this transaction,
      returning the results as an `AsyncIterable` of `Iterable` rows of
      `Value`s. These iterables will not be used after the associated
      transaction has ended.
  - `.commit[Sync](): void`
    - Ends the transaction, with any committed and saved. The transaction object
      will not be used again.
  - `.rollback[Sync](): void`
    - Ends the transaction, with any changes rolled back. The transaction object
      will not be used again.
  - `.startTransaction[Sync](): driver.Transaction`
    - Starts a new child transaction within this transaction. The transaction
      object will not be used again until the child transaction has ended.

### Driver `Meta` Type Information

A driver SHOULD declare an associated `Meta` type using the `driver.Meta<{...}>`
type function. This is currently used only to specify the `Value` type used by
the driver for bound and result column values. The `Meta` type SHOULD be
provided as the (optional) first type argument to every interface that is
implemented from `driver.sql`.

```ts
type Meta = driver.Meta<{
  Value: bigint | number | null
}>;

export class Driver extends driver.Driver<Meta> { … }
```

If a driver does not define and use its own `Meta` type, a default `Meta` will
be used which expects only the the JSON primitive types: `null`, `boolean`,
`number` and `string`.

## Database Consumer API (`x/database/sql/sql.ts`)

This is the primary interface for most users. `Value` below represents the
driver-defined `Value` type for bindings and results. The interface is entirely
async for now, even if the underlying driver supports sync operations.

- `sql.open(path, driver): Promise<sql.Database>`
  - Creates a database handle/connector with the given driver and path. May
    validate the arguments (path), but will not open a connection yet.
- `sql.Database` class
  - `.connect(): Promise<sql.Connection>`
    - Opens a new open connection to the database. In the future a connection
      pool will be maintained instead of always opening new connections.
- `sql.Connection` class
  - `.startTransaction(): Promise<sql.Transaction>`
    - Starts a new transaction in the connection. If a top-level transaction is
      already in progress on this connection, this will block until it is
      finished.
  - `.close(): Promise<void>`
    - Closes the connection. If there is an active transaction, this will block
      until it is finished.
- `sql.Transaction` class
  - `.prepareStatement(query: string): Promise<sql.PreparedStatement>`
    - Prepares a SQL query for execution in this transaction.
  - `.commit(): Promise<void>`
    - Completes the transaction with changes committed.
  - `.rollback(): Promise<void>`
    - Completes the transaction with changes rolled back.
  - `.startTransaction(): Promise<sql.Transaction>`
    - Starts a nested transaction within this transaction. If a nested
      transaction is already in progress, this will block until it is finished.
      While a nested transaction is in progress, queries should be executed
      through it, not the parent transaction.
- `sql.PreparedStatement` class
  - `.query(args?): AsyncGenerator<Iterator<Value>>`
    - Executes the query with an optional array of bound values, and
      incrementally reads rows from the database. The iterator should be
      disposed of by calling `.return()` (which a `for await` statement will do
      automatically).
  - `.queryRow(args?): Promise<Array<Value>>`
    - Executes the query with an optional array of bound values, returning only
      the first row of results, as an array.
  - `.exec(args?): Promise<{ insertedRowId?: Value, affectedRowCount?: number }>`
    - Executes the query with an optional array of bound values, without
      returning any result rows. A `insertedRowId` and `affectedRowCount` value
      may be returned, but note that for some drivers these values may reflect a
      previous query if the executed one did not actually insert or affect any
      rows. (These should only be absent if the driver is certain that they're
      not relevant to executed query, or doesn't support them at all.)
  - `.dispose(): Promise<void>`

### Implementation Notes

Most of the interface described above is just a thin wrapper over the driver
interface. In these cases, the implementation's main responsibility will be to
enforce the invariants we promise for drivers. For example, if the user attempts
to `.query()` a `sql.Transaction` from a closed connection, we should throw an
error ourselves instead of relying on the driver's behaviour.

The exception is for prepared statements, which are used in the consumer
interface even though they're not present in the driver interface yet. This is
because they're not supported by one of the driver's we're currently working
with (`deno-sqlite`), so we're going to just provide our shim implementation for
now. We'll add an optional interface for supporting drivers in the future.

## Cancellation, Timeouts, Context

Cancellation and timeouts are not supported in this release. Something like Go's
[Context](https://blog.golang.org/context), or potentially using
[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController),
will be considered for a future release.

## Included Driver Implementations (`x/database/x/…`)

Once this library's driver interface is complete and stable, it is expected that
driver libraries would implement the supporting interface themselves, without
anything required in this repository. However, that can't happen while this is
still under unstable development, so for now we will directly include driver
interface implementations for a couple different database driver libraries:

- `…/sqlite.ts` wrapping [`/x/sqlite/`](https://deno.land/x/sqlite), an
  [MIT-Licensed](https://github.com/dyedgreen/deno-sqlite/blob/master/LICENSE)
  synchronous in-process WASM SQLite library.
- `…/postgres.ts` wrapping [`/x/postgres/`](https://deno.land/x/postgres), an
  [MIT-Licensed](https://github.com/denodrivers/postgres#license) asynchronous
  PostgreSQL client library.
