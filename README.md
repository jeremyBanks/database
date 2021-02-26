# /x/database/

https://deno.land/x/database@0.1.0

**/x/database/** provides abstract TypeScript interfaces for databases in
[Deno], inspired by Go's [**database**](https://golang.org/pkg/database/)
package.

[Deno]: https://deno.land/

## Contents

- [**/x/database/sql/**](./sql/)

## Style

Use `deno fmt`. Use `// deno-fmt-ignore` sparingly.

Use `deno --unstable lint`. Use `// deno-lint-ignore` liberally.

SQL is CamelCased as `SQL`, not `Sql`.

Stable releases are tagged with three-part [semver] version numbers such as
`2.1.0`, not `v2.1.0` or `2.1`.

[semver]: https://semver.org/spec/v2.0.0.html

Flexible type parameters can be valuable, but when practical they should provide
unobtrusive defaults for users that don't need them.

An underscore prefix on a module or directory name indicates that it's internal
and isn't intended to be imported from outside of its parent directory. For
example:

- `/x/sqlite.ts` may import `/sql/driver.ts` (no underscore prefixes present).
- `/sql/sql.ts` may import `/_common/mod.ts` because it is also within
  `/_common`'s parent directory, `/` (the project root).
- `/sql/sql.ts` should not import `/x/_helper.ts` because it is outside of
  `/x/_helper.ts`'s parent directory, `/x/`.
- `/sql/sql.ts` should not import `/_common/_typing/rome.ts` because is is
  outside of `/_common/_typing`'s parent directory, `/_common`.
- User code may import `/sql/driver.ts` (no underscore prefixes present, so it's
  part of the module's public API).
- User code should not import `/_common/async.ts` or any other paths with
  underscore-prefixed components (they are module-internal and have no stability
  guarantees between versions)

## License

Copyright Jeremy Banks and [contributors]. Released under the [MIT License].

[contributors]: https://github.com/jeremyBanks/database/graphs/contributors
[MIT License]: http://opensource.org/licenses/MIT

Includes some type definitions copied from code that is Copyright Facebook Inc
and Sebastian McKenzie, and some copied from code that is Copyright Shopify.
These are under the MIT License and annotated with links to the original
sources.

Some parts of this package are inspired by Go packages that are copyright The Go
Authors and released under [Go's BSD-style License].

[Go's BSD-style License]: https://golang.org/LICENSE

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the [Apache License 2.0], shall
be released under both the [MIT License] and the [Apache License 2.0].

[Apache License 2.0]: http://www.apache.org/licenses/LICENSE-2.0
