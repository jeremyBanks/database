/** @fileoverview Package sql a generic interface around SQL (or SQL-like) databases.
 * 
 * Inspired by https://golang.org/src/database/sql/sql.go.
 */
import * as driver from "./driver.ts";

import * as sqlite from "../x/sqlite.ts";
import Context from "../_common/context.ts";

const defaultMemoryDriver: driver.Driver<driver.Meta<{
  Value: string | null | boolean
}>> = sqlite.driver;

export const open = <Driver extends driver.Driver>(path: string, driver: Driver = defaultMemoryDriver): Promise<Database<Meta>> => {
  if (driver.open) {
    const connection = driver.open(path, {
      context: Context.TODO
    });
    return new Database<Driver>
  }
  
  return notImplemented();
};



/**
 * `Database` is a database handle representing a pool of zero or more underlying connections.
 */
export class Database<Driver extends driver.Driver = driver.Driver> {
  constructor(
    private driver: Driver,
  ) {}

  private connectionLimit = 1;
  private availableConnections = new Set();
}
