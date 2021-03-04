# x/database/sql for Deno, Version 0.1

**Start Date:** February 28, 2021

**Design & Implementation Review:**
[database#3](https://github.com/jeremyBanks/database/pull/3)

---

1. [Background](#background)
2. [Goals](#goals)
3. [Error Types](#error-types)
4. [Database Driver Interface](#database-driver-interface)
5. [Database Consumer Interface](#database-consumer-interface)
6. [Bundled Driver Implementations](#bundled-driver-implementations)
7. [Potential Future Enhancements](#potential-future-enhancements)

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

## Error Types

`./errors.ts` exports several error classes corresponding to major types of
database-related errors that might be raised by this library. Driver
implementations are typically also expected to only throw errors of these types
as documented, though they're free to use subclasses to add more detail or
behaviour. The exported error type hierarchy is as follows:

- `DatabaseError`
  - Extends the built-in `AggregateError` to make it easy to capture internal
    error objects to aid debugging.
  - Base class for all of our typically-expected errors.
  - `DatabaseConnectorValidationError`
    - Indicates that a database connector was created with an invalid path.
  - `DatabaseConnectivityError`
    - Indicates that an unrecoverable network or filesystem error interrupted
      the database connection and caused an operation to fail.
  - `DatabaseEngineError`
    - Base class for all errors received from the database itself, rather than
      produced by our logic.
    - `DatabaseEngineConstraintError`
      - A database driver error indicating that a constraint was violated.
    - `DatabaseEnginePermissionError`
      - A database driver error indicating that a permission was missing.

- `DriverTypeError`
  - Extends the built-in `TypeError`, representing the violation of static
    expectations/invariants.
  - Indicates that the database driver has performed in an unexpected way. This
    may indicate a bug or version incompatibility in the driver or this library.
  - `MissingImplementationDriverTypeError`
    - Indicates that the driver was missing an implementation of a method that
      it was required to have.

In typical circumstances, the methods described below should only throw
instances of `DatabaseError` types as individually documented. However, any
method may throw `TypeError` if its interface requirements are violated, such as
passing it the wrong types, or attempting to use a disposed resource like a
closed connection. This library may also may throw a `DatabaseDriverError` if a
driver performs in an unexpected way, in violation of its interface
requirements.

## Database Driver Interface

Inspired by [`driver.go`](https://golang.org/src/database/sql/driver/driver.go),
`./driver.ts` exports interfaces for database driver libraries to implement for
interoperability with `./sql.ts`'s user interface. **Most users should have no
reason to use these interfaces directly.** Note that drivers do not "register"
themselves with this library as they do in with the Go package.

Many of these interfaces define methods in both optional async and sync
variants, such as `connect?(): Promise<Connection>` and
`connectSync?(): Connection`. In these cases, drivers may choose to implement
one or both variations of each method. Async method implementations must always
throw errors asynchronously.

Drivers should only throw errors of the specified types, assuming they are used
correctly. (If documented invariants are violated, or objects of invalid types
are passed in, their behaviour may be undefined. Throwing `TypeError` may be a
good idea.)

- `driver.Module` interface
  - `.driver: Driver`
  - Driver library modules should implicit implement this interface themselves
    by exporting an instance of their `Driver` implementation as `.driver`. This
    is the entry point through which the other interfaces will be accessed.
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

      May throw `DatabaseConnectorValidationError`.
- `driver.Connector` interface
  - `.connect[Sync](): driver.Connection`
    - Returns an open connection to the database.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
- `driver.Connection` interface
  - `.query[Sync](sql: string, arguments?: Array<BoundValue>): AsyncIterable<Iterable<BoundValue>>`
    - Executes a query against the database without using a transaction,
      returning the results as an `AsyncIterable` of `Iterable` rows of
      `ResultValue`s.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.startTransaction[Sync](): driver.Transaction`
    - Starts a new transaction within in the connection.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.lastInsertedId[Sync](): ResultValue | undefined`
    - The primary key of the last row inserted through this connection. If the
      last query did not insert a row, the result of this method may be a stale
      value or `undefined`.

      May throw `DatabaseConnectivityError`.
  - `.affectedRows[Sync](): number | undefined`
    - The number of rows affected by the last query through this connection. If
      the last query was of a type that could not affect any rows, the result of
      this method may be a stale value or `undefined`.

      May throw `DatabaseConnectivityError`.
  - `.close[Sync](): void`
    - Close the connection, blocking until it is closed.

      Must not throw.

      Drivers may assume that no other methods on the Connection will be called
      after `close` has been called, but `close` may be called multiple times.
- `driver.Transaction` interface
  - `.query[Sync](sql: string, arguments?: Array<BoundValue>): AsyncIterable<Iterable<BoundValue>>`
    - Executes a query against the database in the context of this transaction,
      returning the results as an `AsyncIterable` of `Iterable` rows of
      `ResultValue`s.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

      Drivers may assume that these iterables will not be consumed after the
      associated Transaction or Connection has closed.
  - `.commit[Sync](): void`
    - Closes the transaction and any child transactions, with any changes
      committed and saved.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

      Drivers may assume that no methods on the Transaction will be called after
      `commit` has been called.
  - `.rollback[Sync](): void`
    - Closes the transaction and any child transactions, with any changes rolled
      back.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

      Drivers may assume that no methods on the Transaction will be called after
      `rollback` has been called.
  - `.startTransaction[Sync](): driver.Transaction`
    - Starts a new child transaction within this transaction.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.

      Drivers may assume no methods will be called on this transaction while it
      has an open child transaction, except for `rollback` and `commit`.

### Driver `Meta` Type Information

A driver should declare an associated `Meta` type using the `driver.Meta<{...}>`
type function. This is currently used only to specify the types used by the
driver for bound and result column values. The `Meta` type should be provided as
the first type argument to every interface that is implemented from
`driver.sql`.

```ts
type Meta = driver.Meta<{
  BoundValue: bigint | number | null | Date,
  ResultValue: bigint | number | null
}>;

export class Driver extends driver.Driver<Meta> { … }
```

If a driver does not define and use its own `Meta` type, a default `Meta` will
be used which expects only the the JSON primitive types: `null`, `boolean`,
`number` and `string`.

## Database Consumer Interface

Inspired by [`sql.go`](https://golang.org/src/database/sql/sql.go), `./sql.ts`
is our primary module, providing an consistent abstract interface for users of
any database driver. `BoundValue` and `ResultValue` below represents the
driver-defined types for bindings and results. The interface is entirely async
for now, even if the underlying driver supports sync operations.

- `sql.open(path, driver): Promise<sql.Database>`
  - Creates a database handle/connector with the given driver and path. May
    validate the arguments (path), but will not open a connection yet.

    May throw `DatabaseConnectorValidationError` if the path is invalid.
- `sql.Database` class
  - `.connect(): Promise<sql.Connection>`
    - Opens a new open connection to the database. In the future a connection
      pool will be maintained instead of always opening new connections.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
- `sql.Connection` class
  - `.startTransaction(): Promise<sql.Transaction>`
    - Starts a new transaction in the connection. If if there is an already an
      active transaction in progress on this connection, this will block until
      it is closed.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.prepareStatement(query: string): Promise<sql.PreparedStatement>`
    - Prepares a SQL query for execution in this connection without a
      transaction.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.close(): Promise<void>`
    - Closes the connection. If there is an active transaction, this will block
      until it is closed.

      Will not throw.
  - `.closed(): Promise<void>`
    - Blocks until the connection is closed.

      Will not throw.
- `sql.Transaction` class
  - `.prepareStatement(query: string): Promise<sql.PreparedStatement>`
    - Prepares a SQL query for execution in this transaction.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.commit(): Promise<void>`
    - Closes the transaction and any open nested transactions with changes
      committed.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.rollback(): Promise<void>`
    - Closes the transaction and any open nested transactions with changes
      rolled back.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.startTransaction(): Promise<sql.Transaction>`
    - Starts a nested transaction within this transaction. If a nested
      transaction is already in progress, this will block until it is closed.
      While a nested transaction is in progress, queries should be executed
      through the inner-most active transaction, not the parent transaction, or
      else they will block until the child transaction is closed.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.closed(): Promise<void>`
    - Blocks until the transaction is closed.

      Will not throw.
- `sql.PreparedStatement` class
  - `.query(args?: Array<BoundValue>): AsyncGenerator<Iterator<ResultValue>>`
    - Executes the query with an optional array of bound values, and
      incrementally reads rows from the database. The iterator should be
      disposed of by calling `.return()` (which a `for await` statement will do
      automatically).

      Will throw `TypeError` if the generators are consumed

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.queryRow(args?: Array<BoundValue>: Promise<Array<ResultValue>>`
    - Executes the query with an optional array of bound values, returning only
      the first row of results, as an array.

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.exec(args?: Array<BoundValue>: Promise<{ insertedRowId?: ResultValue, affectedRowCount?: number }>`
    - Executes the query with an optional array of bound values, without
      returning any result rows. A `insertedRowId` and `affectedRowCount` value
      may be returned, but note that for some drivers these values may reflect a
      previous query if the executed one did not actually insert or affect any
      rows. (These should only be absent if the driver is certain that they're
      not relevant to the executed query, or doesn't support them at all.)

      May throw `DatabaseConnectivityError` or `DatabaseEngineError`.
  - `.dispose(): Promise<void>`
    - Disposes of this object so that any associated resources can be freed.

      Calling `dispose` multiple times is safe, but calling any other method
      after calling `dispose` will cause a `TypeError`.

      Will not throw.

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

The methods descriptions above will included in the code as docstrings for the
sake of Deno Doc's generated API documentation.

## Bundled Driver Implementations

Once this library's driver interface is complete and stable, it is expected that
driver libraries would implement the supporting interface themselves, without
anything required in this repository. However, that can't happen while this is
still under unstable development, so for now we will directly include driver
interface implementations for a couple different database driver libraries:

- `./x/sqlite.ts` wrapping [`x/sqlite/`](https://deno.land/x/sqlite), an
  [MIT-Licensed](https://github.com/dyedgreen/deno-sqlite/blob/master/LICENSE)
  synchronous in-process WASM SQLite library.
- `./x/postgres.ts` wrapping [`x/postgres/`](https://deno.land/x/postgres), an
  [MIT-Licensed](https://github.com/denodrivers/postgres#license) asynchronous
  PostgreSQL client library.

## Potential Future Enhancements

Ideas that are out-of-scope for this minimal initial release but we might like
to consider for the future.

### Connection Pooling

`sql.Database` should probably implement connection pooling like Go's `sql.DB`.

### Simple Implicit Delegation

As the Go package supports, we should allow simple implicit delegation/let users
skip boilerplate when they don't care. You should be able to call
`await opener.queryRow("SELECT 2")` and have `sql.ts` implicitly open a
connection and start a transaction, instead of needing to do so explicitly.

As with the Go package, optional interfaces could be later added for drivers
that can provide more direct and efficient ways to preform these operation.

### Cancellation, Timeouts, Context

Cancellation and timeouts are not supported in this release. Something like Go's
[Context](https://blog.golang.org/context), or potentially using
[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController),
will be considered for a future release.

### Synchronous Consumer Interface

If a driver implements `-Sync` methods, our user interface should also support
appropriate corresponding `-Sync` methods of its own.

### `driver.Query` Interface and <code>SQL\`…\`</code> Strings

`driver.Query` will be a generic interface that can be implemented to provide a
SQL string and optionally bound parameters to a query. We will provide an
implementation in the form of <code>SQL\`…\`</code> strings that can be safely
interpolated with bound values and dynamic identifiers.
[This was one of my motivations for working on this
library](https://github.com/dyedgreen/deno-sqlite/pull/104). But it's
non-essential sugar.

### "Managed Transactions"

I would like to have what Sequelize calls a
["managed transactions" interface](https://sequelize.org/master/manual/transactions.html#managed-transactions),
where an async callback function's settlement result (returning or throwing) is
used to implicitly commit or rollback a transaction.
