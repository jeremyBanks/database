/** @fileoverview Package sql a generic interface around SQL (or SQL-like) databases.
 *
 * Inspired by https://golang.org/src/database/sql/sql.go
 */
import * as driver from "./driver.ts";

import * as sqlite from "../x/sqlite.ts";
import Context from "../_common/context.ts";
import { Arguments, ThenType } from "../_common/typing.ts";
import { unreachable } from "../_common/assertions.ts";
import { Disposable } from "../_common/disposable.ts";

// deno-lint-ignore require-await
export const open = async <
  Meta extends driver.BaseMeta = driver.BaseMeta,
  Driver extends
    & driver.Driver<Meta>
    & (driver.Opener<Meta> | driver.OpenerSync<Meta>) =
      & driver.Driver<Meta>
      & (driver.Opener<Meta> | driver.OpenerSync<Meta>),
>(
  path: string,
  driverModule: { driver: Driver },
): Promise<Database<Meta>> => {
  const driver = driverModule.driver;
  return new Database<Meta, Driver>(driver, path);
};

/**
 * `Database` is a database handle representing a pool of zero or more underlying connections.
 */
export class Database<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> extends Disposable {
  constructor(
    private driver: Driver,
    private path: string,
  ) {
    super();
  }

  connect(opts?: { context?: Context }):
    & Promise<Connection<Meta, Driver>>
    & Pick<Disposable<Connection<Meta, Driver>>, "use"> {
    const connection = Promise.resolve().then(async () =>
      await this.driver?.open?.(this.path, opts) ??
        this.driver?.openSync?.(this.path, opts) ?? unreachable()
    ).then((inner) => new Connection(inner));

    return Object.assign(connection, {
      use<Result>(f: (resource: Connection<Meta, Driver>) => Result) {
        return connection.then((connection) => connection.use(f));
      },
    });
  }

  async *query(
    sql: string,
    parameters?: Array<Meta["Value"]>,
    opts?: { context?: Context },
  ) {
    yield* await this.connect().use(async (connection) =>
      await connection.query(sql, parameters, opts)
    );
  }
}

export class Connection<
  Meta extends driver.BaseMeta,
  Driver extends driver.Driver<Meta> = driver.Driver<Meta>,
> extends Disposable {
  #connection: driver.Connection<Meta>;
  constructor(
    connection: driver.Connection<Meta>,
  ) {
    super();
    this.#connection = connection;
  }

  async *query(
    sql: string,
    parameters?: Array<Meta["Value"]>,
    opts?: { context?: Context },
  ) {
    yield* [];
  }
}
