import { assert } from "https://deno.land/std@0.87.0/testing/asserts.ts";

import * as database from "./mod.ts";

Deno.test({
  name: "import * from x/database/mod.ts",
  fn() {
    assert(database);
  },
});
