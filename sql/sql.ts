/** @fileoverview Package sql a generic interface around SQL (or SQL-like) databases.
 * 
 * Inspired by https://golang.org/src/database/sql/sql.go
 */
import * as driver from "./driver.ts";

import * as sqlite from "../x/sqlite.ts";
import Context from "../_common/context.ts";
import { unreachable } from "../_common/assertions.ts";

export const open = async <
  Meta extends driver.BaseMeta = driver.BaseMeta,
  Driver extends driver.Driver<Meta> & driver.Supporting<driver.Opener> =
    & driver.Driver<Meta>
    & driver.Supporting<driver.Opener>,
>(
  path: string,
  driver: Driver,
): Promise<Database<Meta>> => {
  let connection;

  const context = Context.TODO;

  // this seems like a premature connection

  if (driver.open) {
    connection = await driver.open(path, { context });
  } else if (driver.openSync) {
    connection = driver.openSync(path, { context });
  } else {
    return unreachable(`driver does not support Opener`);
  }

  return new Database<Meta, Driver>(driver, connection);
};

const db = open(':memory:', sqlite.driver)

/**
 * `Database` is a database handle representing a pool of zero or more underlying connections.
 */
export class Database<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> {
  constructor(
    private driver: Driver,
    private connection: driver.Connection<Meta>,
  ) {}
}
