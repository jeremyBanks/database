import * as sql from "../sql/driver.ts";

type Meta = sql.Meta<{
  Value: null | string;
}>;

class Driver implements sql.Driver<Meta> {
  openSync(_path: string): Connection {
    return new Connection(this);
  }
}

export const driver = new Driver();

class Connection implements sql.Connection<Meta> {
  constructor(readonly driver: Driver) {}
}
