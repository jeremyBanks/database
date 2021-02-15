import * as driver from "../sql/driver.ts";

export type Meta = driver.Meta<{
  sqlDialectName: "sqlite";
  Value: null | boolean | number | string | bigint | Uint8Array;
}>;


export class Driver implements driver.Driver<Meta> {
  async open(_path: Meta["Value"]) {
    return new Connection();
  }
}

export default new Driver;

export class Connection implements driver.Connection<Meta> {

}
