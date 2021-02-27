# /x/database/x/

https://deno.land/x/database@0.1.0/x

Compatibility wrappers drivers for various database libraries.

## Contents

- [`sqlite.ts`](./sqlite.ts) wraps [`/x/sqlite/`](https://deno.land/x/sqlite), a
  synchronous in-process WASM SQLite library.
  [Used under the MIT License](https://github.com/dyedgreen/deno-sqlite/blob/master/LICENSE).
- [`postgres.ts`](./postgres.ts) wraps
  [`/x/postgres/`](https://deno.land/x/postgres), an asynchronous PostgreSQL
  client library.
  [Used under the MIT license](https://github.com/denodrivers/postgres#license).
