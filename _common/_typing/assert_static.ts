export const assertStatic = undefined as unknown as Pass;
export const ssertStatic = assertStatic;
type Pass = [void];
type Fail<T> = [[T]];

export type StrictlyExtends<Type, Supertype> = Type extends Supertype
  ? Supertype extends Type
    ? Fail<[Type, "equals", Supertype, "but does not extend it"]>
  : Pass
  : Fail<[Type, "does not extend", Supertype]>;

export type Extends<Type, Supertype> = Type extends Supertype ? Pass
  : Fail<[Type, "does not extend or equal", Supertype]>;

export type Equals<Left, Right> = Left extends Right ? Right extends Left ? Pass
: Fail<[Left, "extends", Right, "but does not equal it"]>
  : Right extends Left ? Fail<[Right, "extends", Left, "but does not equal it"]>
  : Fail<[Left, "and", Right, "are not equal"]>;
