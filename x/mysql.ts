import * as mysql from "https://deno.land/x/mysql@v2.8.0/mod.ts";

import * as driver from "../sql/driver.ts";
import * as errors from "../sql/errors.ts";

export type ResultValue =
  | null
  | boolean
  | number
  | string
  | bigint
  | Uint8Array
  | Date;

export type BoundValue = ResultValue;
export type Meta = driver.Meta<{
  BoundValue: BoundValue;
  ResultValue: ResultValue;
}>;

export class Driver implements driver.Driver<Meta> {
  openConnectorSync(path: string) {
    let url;
    try {
      url = new URL(path);
    } catch (error) {
      throw new errors.DatabaseConnectorValidationError([error]);
    }

    let clientConfig: mysql.ClientConfig;

    if (url.protocol === "file:") {
      clientConfig = {
        socketPath: url.pathname,
      };
    } else if (url.protocol === "mysql:") {
      // The URL class will only parse components if set to a known protocol.
      url.protocol = "https:";

      clientConfig = {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        username: url.username,
        password: url.password,
        db: url.pathname.slice(1),
      };
    } else {
      throw new errors.DatabaseConnectorValidationError(
        [],
        `Unexpected protocol in connection URL: ${url}`,
      );
    }

    return new Connector(clientConfig);
  }
}

const mysqlDriver = new Driver();
export { mysqlDriver as driver };

export class Connector implements driver.Connector<Meta> {
  constructor(private readonly clientConfig: mysql.ClientConfig) {}

  async connect() {
    const innerClient = new mysql.Client();
    await innerClient.connect(this.clientConfig);
    await innerClient.useConnection(() => Promise.resolve());
    return new Connection(innerClient);
  }
}

export class Connection implements driver.Connection<Meta> {
  constructor(private readonly innerClient: mysql.Client) {}

  async close() {
    await this.innerClient.close();
  }
}
