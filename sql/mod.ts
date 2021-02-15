import * as driver from "./driver.ts";

export const open = (driverId: string, path: string): Database => {
  throw new Error();
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
