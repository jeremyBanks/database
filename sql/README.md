# x/database/sql

https://deno.land/x/database@0.1.0/sql

**x/database/sql** provides an abstract TypeScript interface for SQL databases
in [Deno], inspired by Go's [**database/sql**](https://pkg.go.dev/database/sql)
and [**jmoiron/sqlx**](https://pkg.go.dev/github.com/jmoiron/sqlx) packages.

[Deno]: https://deno.land/

## Usage

```ts
import sql from "https://deno.land/x/database@0.1.0/sql.ts";

// Import your supporting database driver module of choice.
import sqlite from "https://deno.land/x/database@0.1.0/x/sqlite.ts";

// Use of SQL-tagged strings is highly encouraged but not required.
import SQL from "https://deno.land/x/database@0.1.0/strings.ts";

const database = await sql.open(":memory:", sqlite);

await database.exec(SQL`
  CREATE TABLE User (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
  );
`);

await database.transaction(async (transaction) => {
  for (
    const name of [
      "Dalinar",
      "Adolin",
      "Shallan",
      "Stick",
    ]
  ) {
    await transaction.exec(SQL`
      INSERT INTO Users (name) VALUES (${name})
    `);
  }
});

for await (
  const [id, name] of database.query(SQL`SELECT Id, Name FROM Users`)
) {
  console.log(id, name);
}

const dynamicColumnName = Math.random() < 0.5 ? "Id" : "Name";
const column = SQL.identifier(dynamicColumnName);
const [value] = await database.queryRow(SQL`SELECT ${column} FROM Users`);
console.log(`${dynamicColumnName} is ${value}`);
```

## Driver Module Implementation

```ts
import driver from "https://deno.land/x/database@0.1.0/driver.ts";


const Meta = driver.Meta<{
  // Type of values bound and returned by this Driver.
  Value: string | number | boolean | null
}>;

export const driver = class implements driver.Driver<Meta> {
  async open(path: string): Promise<Connection> {
    // ...
  }
  // and/or
  async openSync(path: string): Connection {
    // ...
  }
};

class Connection implements driver.Connection<Meta> {
  // ...
}
```
