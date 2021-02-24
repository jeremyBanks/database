import * as sqlite from "../x/sqlite.ts";
import * as sql from "../sql/sql.ts";
import { SQL } from "../sql/strings.ts";
import { log } from "../_common/deps.ts";
import { assert } from "../_common/assertions.ts";

await sql.open(":memory:", sqlite).use(async (database) => {
  await database.connect().use(async (connection) => {
    await connection.exec(SQL`
      CREATE TABLE Users (
        Id INTEGER PRIMARY KEY,
        Name UNIQUE TEXT
      )
    `);

    try {
      await connection.transaction().use(async (transaction) => {
        await transaction.exec(SQL`
          INSERT INTO Users (Name) VALUES (${"Chris"})
        `);
        const [name] = await transaction.queryRow(SQL`
          SELECT Name FROM Users LIMIT 1
        `);
        assert(name === "Chris");

        // This violates the uniqueness constraint, which throws an error.
        // Because we do not catch it, the error propagates upwards and
        // causes the parent transaction to be rolled back.
        await transaction.exec(SQL`
          INSERT INTO Users (Name) VALUES (${"Chris"})
        `);
      });
    } catch (error) {
      log.error(`Transaction failed: ${error.stack}`);
    }

    // Outside of the rolled-back transaction, we no longer see any users.
    const [count] = await connection.queryRow(SQL`SELECT COUNT(*) FROM Users`);
    assert(count === 0);
  });
});
