const { BaseDatabaseAdapter } = require("./base");

class SqlRecordAdapter extends BaseDatabaseAdapter {
    table() {
        return quoteIdentifier(this.config.tableName, this.identifierQuote || '"');
    }

    serialize(value) {
        return JSON.stringify(value);
    }

    deserialize(value) {
        if (value === null || value === undefined) return null;

        if (typeof value === "string") return JSON.parse(value);
        if (Buffer.isBuffer(value)) return JSON.parse(value.toString("utf8"));

        return value;
    }
}

function quoteIdentifier(identifier, quote) {
    return `${quote}${identifier.replaceAll(quote, `${quote}${quote}`)}${quote}`;
}

module.exports = {
    SqlRecordAdapter,
};
