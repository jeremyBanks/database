// deno-lint-ignore-file no-explicit-any
import "../sql/driver.ts";

Deno.test({
  name: "aspirational example",
  async fn() {
    await (Deno as any)?.permissions?.request({ name: "read" });

    const sqlite = await import("./x/sqlite.ts" as any);
    const sql = await import("./sql/sql.ts" as any);
    const { SQL } = await import("./sql/strings.ts" as any);

    const database = await sql.open(":memory:", sqlite);

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
    const column = SQL.identifier(dynamicColumnName);
    const [value] = await database.queryRow(SQL`SELECT ${column} FROM Users`);
    console.log(`${dynamicColumnName} is ${value}`);
  },
});
