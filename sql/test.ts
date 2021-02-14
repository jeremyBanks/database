import { assert } from "https://deno.land/std@0.87.0/testing/asserts.ts";

import * as sql from "./mod.ts";

Deno.test({
  name: "import * from x/database/sql/mod.ts",
  fn() {
    assert(sql);
  },
});
