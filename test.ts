import "./sql/driver.ts";
import * as sql "./sql/sql.ts";
import {SQL} from "./sql/strings.ts";
import * as sqlite from "./x/sqlite.ts";

Deno.test({
  name: "example",
  async fn() {
    const db = sql.open(":memory:", sqlite);

    const Users = SQL.identifier("Users");

    const columnNames = [ "firstName", "lastName" ]
    const columns = columnsNames.map(name =>
      SQL`${SQL.identifier(name)} varchar(32)`
    );
    await db.connect().use(async connection => {
      await connection.exec(SQL`
        CREATE TABLE IF NOT EXISTS
        ${Users} (
          ${SQL`, `.joining(columns)}
        )
      `);
    });
  }
})
