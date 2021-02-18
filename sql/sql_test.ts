import * as driver from "./_dummy_driver.ts";

import * as sql from "./sql.ts";

Deno.test("testing with dummy_driver", async () => {
  const db = await sql.open(":memory:", driver);
});
