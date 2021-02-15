// Query is a construct for sql.Database.

interface Query<Driver> {
}

// identifiers will typically be any
// but the driver will be asked to convert them
// before being executed
class Identifier<Meta = any> {
}

type TableName = Identifier;

// an expression that can be converted into a query, given a compatible driver.
interface ToQueryer<Driver> {
}
