// Error types that may be used both internally and externally.

/** DatabaseErrors are AggregateErrors that may contain underlying driver
    errors with more details. */
export class DatabaseError extends AggregateError {
  name: Brand = brand("DatabaseError");
}

/** Indicates that the database driver has performed in an unexpected way.
    This may indicate a bug or incompatibility in the driver or this library. */
export class InternalDriverError extends DatabaseError {
  name = brand("InternalDriverError");
}

/** Indicates invalid connection parameters passed to the connector. */
export class ConnectorValidationError extends DatabaseError {
  name = brand("ConnectorValidationError");
}

/** Indicates an error connecting to the database, such as a network timeout. */
export class ConnectionError extends DatabaseError {
  name = brand("ConnectionError");
}

/** An recognized error response coming from the database itself. */
export class EngineError extends DatabaseError {
  name: Brand<`${string}EngineError`> = brand("EngineError");
}

/** A permission-related error coming from the database itself. */
export class PermissionEngineError extends EngineError {
  name = brand("PermissionEngineError");
}

/** A constraint/integrity-related error coming from the database itself. */
export class ConstraintEngineError extends EngineError {
  name = brand("ConstraintEngineError");
}

// Used to brand each class as a unique nominal type to ensure they're
// distinguished by TypeScript.
const Brand = Symbol("Brand");
type Brand<Name extends string = string> = string & {
  [Brand]?: Name;
};
const brand = <Name extends string>(name: Name): Brand<Name> => name;
