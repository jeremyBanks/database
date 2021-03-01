import { asserts } from "../_common/deps.ts";

import * as sql from "../sql/sql.ts";

import * as sqlite from "./sqlite.ts";

Deno.test("create, count, commit", async () => {
  const connector = await sql.open(":memory:", sqlite);
  const connection = await connector.connect();
  const transaction = await connection.startTransaction();

  await (await transaction.prepareStatement(`
    CREATE TABLE User (
      Id INTEGER PRIMARY KEY,
      Name UNIQUE TEXT,
    );
  `)).exec();

  const insertUserName = await transaction.prepareStatement(
    "INSERT INTO User (Name) VALUES (?)",
  );
  await insertUserName.exec(["Alice"]);
  await insertUserName.exec(["Bob"]);
  await insertUserName.exec(["Charlie"]);
  await insertUserName.exec(["David"]);

  const selectUserCount = await transaction.prepareStatement(
    "SELECT COUNT(*) FROM USER",
  );
  const [count] = await selectUserCount.queryRow();

  asserts.assertEquals(count, 4);

  await transaction.commit();

  const transaction2 = await connection.startTransaction();
  const insertEdward = await transaction.prepareStatement(
    "INSERT INTO User (Name) VALUES ('Edward')",
  );
  await insertEdward.exec("Edward");
  await transaction2.rollback();

  await connection.close();
});
