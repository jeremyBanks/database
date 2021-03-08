/** Base class for all of our typically-expected errors. */
export class DatabaseError extends AggregateError {}

/** Indicates that a database connector was created with an invalid path. */
export class DatabaseConnectorValidationError extends DatabaseError {}

/**
Indicates that an unrecoverable network or filesystem error interrupted the
database connection and caused an operation to fail.
*/
export class DatabaseConnectivityError extends DatabaseError {}

/**
Base class for all errors received from the database itself, rather than
produced by our logic.
*/
export class DatabaseEngineError extends DatabaseError {}

/** A database driver error indicating that a constraint was violated. */
export class DatabaseEngineConstraintError extends DatabaseEngineError {}

/** A database driver error indicating that a permission was missing. */
export class DatabaseEnginePermissionError extends DatabaseEngineError {}

/**
Indicates that the database driver has performed in an unexpected way. This
may indicate a bug or version incompatibility in the driver or this library.
*/
export class DriverTypeError extends TypeError {}

/**
Indicates that the database driver was missing an implementation of a method
that it was required to have.
*/
export class MissingImplementationDriverTypeError extends DriverTypeError {}
