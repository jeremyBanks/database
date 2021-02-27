# /x/database/sql/

https://deno.land/x/database@0.1.0/sql

**/x/database/sql/** provides an abstract TypeScript interface for SQL databases
in [Deno], inspired by Go's
[**database/sql**](https://golang.org/pkg/database/sql/) and
[**jmoiron/sqlx**](https://pkg.go.dev/github.com/jmoiron/sqlx) packages.

[Deno]: https://deno.land/

## Contents

- [`sql.ts`](./sql.ts) ([doc](https://doc.deno.land/https/deno.land/x/database/sql/sql.ts)) provides the primary database interface that most users
  will use. It must be used in conjunction a supporting database driver module
  of choice.

  ```ts
  import sql from "https://deno.land/x/database@0.1.0/sql/sql.ts";
  import sqlite from "https://deno.land/x/database@0.1.0/x/sqlite.ts";

  const database = await sql.open("file::memory:", sqlite);

  const [value] = await database.queryRow(
    "SELECT Name FROM Users WHERE Ids in (?, ?) LIMIT 1",
    [1, 2],
  );
  ```

- [`strings.ts`](./strings.ts) ([doc](https://doc.deno.land/https/deno.land/x/database/sql/strings.ts)) provides a <code>SQL\`…\`</code> string tag
  function that may optionally be used to express queries when using `sql.ts`.
  It supports safe interpolation of bound values, other <code>SQL\`…\`</code>
  strings, and dynamic SQL identifiers (table, column, and database names).

  ```ts
  import SQL from "https://deno.land/x/database@0.1.0/sql/strings.ts";

  const targetIds = [1, 2];
  const column = SQL.identifier("Name");
  const whereClause = SQL`WHERE Id IN ${targetIds}`;
  const [value] = await database.queryRow(
    SQL`SELECT ${column} FROM Users ${whereClause} LIMIT 1`,
  );
  ```

- [`driver.ts`](./driver.ts) ([doc](https://doc.deno.land/https/deno.land/x/database/sql/driver.ts)) provides a set of interfaces (most optional, some
  required) that can be implemented by a driver module for it to support use
  with `sql.ts`. Most users should never need to import this.

## Current Limitations

- The code isn't finished and probably doesn't even run.
- Timeouts and cancellation (contexts) are not implemented.
- Connections are not pooled.
- `sql.Database` only provides an async interface, even for sync drivers.
- `sql.Database` is lacking a lot of convenience methods.
- `driver` provides no optional fast-paths interfaces for optimized drivers.
- No isolation mode options.
- No result row names.
- No result type mapping.
- No tests.
- No docs.
