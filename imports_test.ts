import * as fs from "https://deno.land/std@0.87.0/fs/expand_glob.ts";

// deno-lint-ignore no-explicit-any
await (Deno as any)?.permissions?.request({ name: "read" });

const cwd = Deno.cwd();
for await (const file of fs.expandGlob("**/*.ts")) {
  const encodedPath = JSON.stringify(file.path.replace(cwd, "/x/database"));
  Deno.test(`import ${encodedPath};`, async () => {
    await import(file.path);
  });
}
// deno-lint-ignore-file no-explicit-any
