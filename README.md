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
