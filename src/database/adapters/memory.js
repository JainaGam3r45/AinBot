const { BaseDatabaseAdapter } = require("./base");

class MemoryDatabaseAdapter extends BaseDatabaseAdapter {
    constructor(config) {
        super(config);
        this.records = new Map();
    }

    async get(namespace, key) {
        const record = this.records.get(getRecordId(namespace, key));

        return record ? structuredClone(record.value) : null;
    }

    async set(namespace, key, value) {
        this.records.set(getRecordId(namespace, key), {
            namespace,
            key,
            value: structuredClone(value),
            updatedAt: new Date(),
        });

        return structuredClone(value);
    }

    async delete(namespace, key) {
        return this.records.delete(getRecordId(namespace, key));
    }

    async list(namespace) {
        return Array.from(this.records.values())
            .filter((record) => record.namespace === namespace)
            .sort((left, right) => left.key.localeCompare(right.key))
            .map((record) => ({
                key: record.key,
                value: structuredClone(record.value),
                updatedAt: record.updatedAt,
            }));
    }
}

function getRecordId(namespace, key) {
    return `${namespace}:${key}`;
}

module.exports = {
    MemoryDatabaseAdapter,
};
