const Thrown = Symbol("Thrown");

export type Result<Returned, Thrown extends globalThis.Error> =
  & Returned
  & {
    [Thrown]?: Thrown;
  };

export type Infallible<Result> = Result & { [Thrown]?: never };

export type ThrownType<Result> = Result extends {
  [Thrown]?: infer T;
} ? T
  : never;
