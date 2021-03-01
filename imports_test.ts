import { fs } from "./_common/deps.ts";

// Generates a test for each .ts file to verify that it can be imported.
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
