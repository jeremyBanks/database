# Simple Delegation Sugar

**Date:** _mm_, _dd_, 2021

**Status:** incomplete

### Goals

We should provide some simple sugar wrapping/delegation for cases when users
don't need fine-grained control.

`sql.Database` should delegate to a `sql.Connection`, which should delegate to a
`sql.Transaction`.

`sql.Transaction` should provide `exec`/`query`/`queryRow` methods through a
`.prepare()`ed instance.
