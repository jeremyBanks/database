import * as sqlite from "../x/sqlite.ts";
import * as sql from "../sql/sql.ts";
import { SQL } from "../sql/strings.ts";
import { log } from "../_common/deps.ts";
import { assert } from "../_common/assertions.ts";

const dbPool = await sql.open(":memory:", sqlite).use(async (database) => {
  await database.connect().use(async (connection) => {
    await connection.exec(SQL`
      CREATE TABLE Users (
        Id INTEGER PRIMARY KEY,
        Name UNIQUE TEXT
      )
    `);
  });
});
