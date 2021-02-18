// deno-lint-ignore-file
/** @fileoverview Provides composable typed SQL query types. */
import { notImplemented } from "../_common/assertions.ts";

export const toSQLExpression = Symbol("toSQLExpression");

export class SQLString<Bindings = unknown> {
  constructor(readonly parts: Array<SQLStringPart>) {}
}

export type SQLStringPart<BoundValues = unknown> =
  | SQLLiteral
  | SQLIdentifier
  | SQLBoundValue<BoundValues>;

export class SQLLiteral {
  constructor(readonly literal: string) {}
}

export class SQLIdentifier {
  constructor(readonly identifier: string) {}
}

export class SQLBoundValue<Value> {
  constructor(readonly value: Value) {}
}

/**
 * Tag function constructing a SQLExpression with bound interpolated values.
 */
export const SQL = <BoundValues extends [...Array<unknown>]>(
  literals: TemplateStringsArray,
  ...values: BoundValues
): SQLString<BoundValues> => {
  return notImplemented();
  // const flattened: (
  //   | { string: string; value?: undefined }
  //   | { value: BoundValues; string?: undefined }
  // )[] = [];

  // for (let i = 0; i < literals.length; i++) {
  //   const string = literals[i];
  //   flattened.push({ string });

  //   if (i < values.length) {
  //     let value = values[i];
  //     while (
  //       !(value instanceof SQLString) &&
  //       typeof (value as any)?.[toSQLExpression] === "function"
  //     ) {
  //       value = (value as any)?.[toSQLExpression]();
  //     }
  //     if (value instanceof SQLString) {
  //       for (let j = 0; j < value.literal.length; j++) {
  //         flattened.push({ string: value.literal[j] });

  //         if (j < value.sqlParams.length) {
  //           flattened.push({ value: value.sqlParams[j] });
  //         }
  //       }
  //     } else if (typeof value === "object" && value !== null) {
  //       throw new TypeError(
  //         "attempted to interpolate unsupported object into SQL",
  //       );
  //     } else {
  //       flattened.push({ value });
  //     }
  //   }
  // }

  // const flattenedStrings = [];
  // const flattenedValues = [];

  // let stringBuffer = "";
  // for (const { string, value } of flattened) {
  //   if (string !== undefined) {
  //     stringBuffer += string;
  //   } else if (value !== undefined) {
  //     flattenedStrings.push(stringBuffer);
  //     stringBuffer = "";
  //     flattenedValues.push(value);
  //   } else {
  //     throw new TypeError("flattened[…].string and .value are both undefined");
  //   }
  // }
  // flattenedStrings.push(stringBuffer);

  // return new SQLExpression(flattenedStrings, flattenedValues);
};
