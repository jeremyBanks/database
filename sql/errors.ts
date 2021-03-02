// Error types that may be used both internally and externally.

/** DatabaseErrors are AggregateErrors that may contain underlying driver errors. */
export class DatabaseError extends AggregateError {}

/** Indicates invalid connection parameters passed to the connector. */
export class ConnectorValidationError extends DatabaseError {}

/** Indicates an error connecting to the database, such as a network timeout. */
export class ConnectionError extends DatabaseError {}

/** An error response coming from the database itself. */
export class EngineError extends DatabaseError {}

/** A permission-related error coming from the database itself. */
export class PermissionError extends EngineError {}

/** A constraint/integrity-related error coming from the database itself. */
export class ConstraintError extends EngineError {}
