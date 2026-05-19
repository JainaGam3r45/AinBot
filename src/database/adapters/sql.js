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

    normalizeRecord(record) {
        return {
            namespace: record.namespace,
            key: record.key,
            value: this.deserialize(record.value),
            updatedAt: normalizeDate(record.updatedAt),
        };
    }

    normalizeRecordDate(value) {
        return normalizeDate(value);
    }
}

function quoteIdentifier(identifier, quote) {
    return `${quote}${identifier.replaceAll(quote, `${quote}${quote}`)}${quote}`;
}

function normalizeDate(value) {
    if (!value) return new Date();
    if (value instanceof Date) return value;

    return new Date(value);
}

module.exports = {
    SqlRecordAdapter,
};
