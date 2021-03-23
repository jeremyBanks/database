import { asserts } from "../_common/deps.ts";

import * as sqlite from "../x/sqlite.ts";
import * as postgres from "../x/postgres.ts";
import * as mysql from "../x/mysql.ts";

import * as sql from "./sql.ts";

for (
  const [name, openConnector] of [
    [
      "sqlite: memory",
      () => sql.open<sqlite.Meta>(":memory:", sqlite),
    ],
    [
      "sqlite: filesystem",
      () => sql.open<sqlite.Meta>(".test.sqlite.tmp", sqlite),
    ],
    [
      "postgres: server",
      () =>
        sql.open<postgres.Meta>(
          "postgres://postgres@localhost/postgres",
          postgres,
        ),
    ],
    [
      "mysql: server",
      () =>
        sql.open<mysql.Meta>(
          "mysql://mysql@localhost/mysql",
          mysql,
        ),
    ],
  ] as const
) {
  Deno.test({
    name: `${name}: create, count, commit`,
    ignore: /mysql/.test(name),
    async fn() {
      const connector = await openConnector();
      const connection = await connector.connect();
      const transaction = await connection.startTransaction();

      await (await transaction.prepareStatement(`
      DROP TABLE IF EXISTS "User"
    `)).exec();

      await (await transaction.prepareStatement(`
      CREATE TABLE "User" (
        Id INTEGER PRIMARY KEY,
        Name TEXT UNIQUE
      )
    `)).exec();

      const insertUserName = await transaction.prepareStatement(
        `INSERT INTO "User" (Name) VALUES ($1)`,
      );
      await insertUserName.exec(["Alice"]);
      await insertUserName.exec(["Bob"]);
      await insertUserName.exec(["Charlie"]);
      await insertUserName.exec(["David"]);

      const selectUserCount = await transaction.prepareStatement(
        `SELECT COUNT(*) FROM "User"`,
      );
      const [count] = (await selectUserCount.queryRow())!;

      asserts.assertEquals(count, 4);

      await transaction.commit();

      const transaction2 = await connection.startTransaction();
      const insertEdward = await transaction.prepareStatement(
        `INSERT INTO "User" (Name) VALUES ('Edward')`,
      );
      await insertEdward.exec();

      await transaction2.rollback();

      await connection.close();
    },
  });
}
