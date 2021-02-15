import * as sql from "../sql/mod.ts";

export * as sqlite from "./sqlite.ts";

export function openConnection(
  driveName: "sqlite",
  dataSource: string,
): sqlite.Connection;
export function openConnection(
  driverName: string,
  dataSource: string,
): sql.Connection {
  if (driverName === "sqlite") {
    return new sqlite.Connection(dataSource);
  }

  throw new Error(`unrecognized driverName: ${driverName}`);
}/** alias for rename from Go API */

export const DB = Database;
