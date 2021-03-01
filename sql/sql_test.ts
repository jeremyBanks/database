import * as sql from "./sql.ts";

import * as sqlite from "../x/sqlite.ts";

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
  await insertUserName.exec("Alice");
  await insertUserName.exec("Bob");
  await insertUserName.exec("Charlie");
  await insertUserName.exec("David");

  const selectUserCount = await transaction.prepareStatement(
    "SELECT COUNT(*) FROM USER",
  );
  const [count] = await selectUserCount.queryRow();

  await transaction.commit();
  await connection.close();
});
