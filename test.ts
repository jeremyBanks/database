import { assert } from "https://deno.land/std@0.87.0/testing/asserts.ts";

import * as driver from "./sql/driver.ts";
import * as sql from "./sql/sql.ts";
import * as strings from "./sql/strings.ts";

Deno.test({
  name: `import * as driver from "./sql/driver.ts"`,
  fn() {
    assert(driver);
  },
});

Deno.test({
  name: `import * as sql from "./sql/sql.ts"`,
  fn() {
    assert(sql);
  },
});

Deno.test({
  name: `import * as strings from "./sql/strings.ts"`,
  fn() {
    assert(strings);
  },
});
