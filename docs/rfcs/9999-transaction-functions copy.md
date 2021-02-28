# Async Function Transactions

**Date:** _mm_, _dd_, 2021

**Status:** incomplete

### Goals

A more sugary transaction interface for `x/database/sql/sql.ts` using an async
function callback. If the function returns normally, the transaction is committed. If it throws an error, the transaction is rolled back.

```ts
const result = await connection.transaction(async transaction => {
  await transaction.exec(SQL`INSERT INTO Users (Name) VALUES ("John")`);
  const [count] = await transaction.queryRow(SQL`SELECT COUNT(*) FROM Users`);
  return count;
});
