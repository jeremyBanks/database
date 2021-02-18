import * as fs from "https://deno.land/std@0.87.0/fs/expand_glob.ts";

try {
  const cwd = Deno.cwd();
  for await (const file of fs.expandGlob("**/*.ts")) {
    const encodedPath = JSON.stringify(file.path.replace(cwd, "/x/database"));
    Deno.test(`import ${encodedPath};`, async () => {
      await import(file.path);
    });
  }
} catch (error) {
  Deno.test("imports_tests.ts", () => {
    throw error;
  });
}
