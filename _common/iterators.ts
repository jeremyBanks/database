export function* flatMap<In, Out>(
  inputs: Iterable<In>,
  f: (x: In) => Iterable<Out> | undefined,
): Generator<Out, void, undefined> {
  for (const input of inputs) {
    yield* f(input) ?? [];
  }
}
