import * as sqlite from "https://deno.land/x/sqlite@v2.3.2/mod.ts";

import * as sql from "../sql/driver.ts";

type Value = null | boolean | number | string | bigint | Uint8Array;

export type Meta = sql.Meta<{
  sqlDialectName: "sqlite",
  Value: Value,
}>;

export class Driver implements sql.Driver<Meta> {
  constructor() {}

  openSync(path: string) {
    return new Connection(this, path);
  }

  encodeIdentifier(identifier: string, opts?: {
      allowWeird?: boolean;
      allowInternal?: boolean;
    },
  ): string {
    const allowWeird = opts?.allowWeird ?? true;
    const allowInternal = opts?.allowInternal ?? false;

    if (identifier.includes("\x00")) {
      throw new TypeError('identifier included a ␀ ("\\x00") character');
    }

    const asUtf8 = (new TextEncoder()).encode(identifier);
    const fromUtf8 = (new TextDecoder()).decode(asUtf8);
    if (identifier !== fromUtf8) {
      throw new TypeError(
        "identifier could not be losslessly encoded as UTF-8",
      );
    }

    // In some cases, SQLite may interpret double-quoted and single-quoted strings
    // to be either string literals or identifiers depending on the context. To
    // avoid any potential ambiguity, we use SQLite's other supported quoting
    // characters, although they aren't standard SQL.
    let encoded;
    if (!identifier.includes("]")) {
      // If the identifier doesn't include a closing square bracket, we can just
      // wrap the value in square brackets.
      encoded = `[${identifier}]`;
    } else {
      // Otherwise, wrap it in backticks and double any backticks it contains.
      encoded = "`" + identifier.replace(/`/g, "``") + "`";
    }

    // We quote all identifiers to avoid potential conflict with keywords, but
    // if you're using a name that syntactically *requires* quoting, that's weird.
    const identifierIsWeird = !/^[a-z_][a-z_0-9]*$/i.test(identifier);
    if (identifierIsWeird && !allowWeird) {
      throw new TypeError(
        `Weird SQL identifier ${
          JSON.stringify(identifier)
        }, encoded as ${encoded}, is not allowed.`,
      );
    }

    // Quoting https://github.com/sqlite/sqlite/blob/c8af879e5f501595d5bc59e15621ce25ab76d566/src/build.c#L879-L881
    //
    // > The sqlite3CheckObjectName routine is used to check if the UTF-8
    // > string zName is a legal unqualified name for a new schema object (table,
    // > index, view or trigger). All names are legal except those that begin
    // > with the string "sqlite_" (in upper, lower or mixed case). This portion
    // > of the namespace is reserved for internal use.
    const identifierIsInternal = /^sqlite_/i.test(identifier);
    if (identifierIsInternal && !allowInternal) {
      throw new TypeError(
        `Internal SQLite identifier ${
          JSON.stringify(identifier)
        } is not allowed.`,
      );
    }

    return encoded;
  }
}

export const driver = new Driver();

export class Connection implements sql.Connection<Meta> {
  constructor(
    readonly driver: Driver,
    private path: string,
  ) {}

  private inner = new sqlite.DB(this.path);

  querySync(sql: string, values: Array<Value>) {
    return this.inner.query(sql, values);
  }
}
