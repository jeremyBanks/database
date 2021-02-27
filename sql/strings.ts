/** @fileoverview Provides a composable typed SQL query string type implementing
the driver.Query interface for use with .query() and .exec() methods. */

// deno-lint-ignore-file

import { notImplemented, unreachable } from "../_common/assertions.ts";
import * as driver from "./driver.ts";

export class SQLString<DriverValue = unknown> {
  constructor(readonly parts: Array<SQLStringPart<DriverValue>>) {}

  forDriver<
    Meta extends { Value: DriverValue },
    Driver extends driver.Driver<Meta>,
  >(
    driver?: Driver,
  ): driver.Query<Meta> {
    const sqlParts = new Array<string>();
    const boundArgs = new Array<DriverValue>();

    for (const part of this.parts) {
      if (part instanceof SQLLiteral) {
        sqlParts.push(part.literal);
      } else if (part instanceof SQLIdentifier) {
        const identifier = part.identifier;
        const driverEncoded = driver?.encodeIdentifierSync?.(identifier, {
          allowInternal: false,
        });

        if (driverEncoded !== undefined) {
          sqlParts.push(driverEncoded);
        } else {
          const trivialIdentifier = /^[a-z][a-z0-9]{0,63}$/i;
          if (trivialIdentifier.test(identifier)) {
            const triviallyEncoded = `"${trivialIdentifier}"`;
            sqlParts.push(triviallyEncoded);
          } else {
            throw new Error(
              `this driver only supports simple dynamic identifiers matching ${trivialIdentifier}, but was provided with ${
                JSON.stringify(identifier)
              }.`,
            );
          }
        }

        notImplemented("identifier encoding not implemented");
      } else if (part instanceof SQLBoundValue) {
        sqlParts.push(" ? ");
        boundArgs.push(part.value);
      } else {
        unreachable();
      }
    }

    return {
      sql: sqlParts.join(""),
      args: boundArgs,
    };
  }
}

export type SQLStringPart<BoundValues = unknown> =
  | SQLLiteral
  | SQLIdentifier
  | SQLBoundValue<BoundValues>;

export type Interpolatable<BoundValues = unknown> =
  | SQLStringPart<BoundValues>
  | Array<SQLLiteral>
  | Array<SQLIdentifier>
  | Array<SQLBoundValue<BoundValues>>;

export class SQLLiteral {
  constructor(readonly literal: string) {}
}

export class SQLIdentifier<Identifier extends string = string> {
  constructor(readonly identifier: Identifier) {}
}

export class SQLBoundValue<Value> {
  constructor(readonly value: Value) {}
}

/**
Tags a SQL`...` string literal to produce a SQLString.
Other SQLStrings can be interpolated into
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
