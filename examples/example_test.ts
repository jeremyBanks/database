// deno-lint-ignore-file no-explicit-any
import * as sqlite from "../x/sqlite.ts";
import * as sql from "../sql/sql.ts";
import { SQL } from "../sql/strings.ts";
import { log } from "../_common/deps.ts";

Deno.test({
  name: "sql.open().query()",
  async fn() {
    await (Deno as any)?.permissions?.request({ name: "read" });

    const database = await sql.open(":memory:", sqlite);

    log.info(database);
  },
});

Deno.test({
  name: "sql.open().exec(),transaction().exec(),query()",
  ignore: true,
  async fn() {
    await (Deno as any)?.permissions?.request({ name: "read" });

    const database = await sql.open(":memory:", sqlite) as any;

    await database.exec(SQL`
      CREATE TABLE User (
        Id INTEGER PRIMARY KEY,
        Name TEXT NOT NULL,
      );
    `);

    await database.transaction(async (transaction: any) => {
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
    const column = (SQL as any).identifier(dynamicColumnName);
    const [value] = await database.queryRow(SQL`SELECT ${column} FROM Users`);
    console.log(`${dynamicColumnName} is ${value}`);
  },
});
