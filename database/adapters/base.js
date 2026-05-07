class BaseDatabaseAdapter {
    constructor(config) {
        this.config = config;
        this.connected = false;
    }

    async connect() {
        this.connected = true;
    }

    async close() {
        this.connected = false;
    }

    async ping() {
        return this.connected;
    }

    async get() {
        throw new Error(`${this.constructor.name} does not implement get().`);
    }

    async set() {
        throw new Error(`${this.constructor.name} does not implement set().`);
    }

    async delete() {
        throw new Error(`${this.constructor.name} does not implement delete().`);
    }

    async list() {
        throw new Error(`${this.constructor.name} does not implement list().`);
    }

    namespace(name) {
        return new DatabaseNamespace(this, name);
    }
}

class DatabaseNamespace {
    constructor(adapter, name) {
        this.adapter = adapter;
        this.name = normalizeNamespace(name);
    }

    get(key) {
        return this.adapter.get(this.name, normalizeKey(key));
    }

    set(key, value) {
        return this.adapter.set(this.name, normalizeKey(key), value);
    }

    delete(key) {
        return this.adapter.delete(this.name, normalizeKey(key));
    }

    list() {
        return this.adapter.list(this.name);
    }
}

function normalizeNamespace(value) {
    const namespace = String(value || "").trim();

    if (!namespace) {
        throw new Error("Database namespace cannot be empty.");
    }

    return namespace;
}

function normalizeKey(value) {
    const key = String(value || "").trim();

    if (!key) {
        throw new Error("Database key cannot be empty.");
    }

    return key;
}

module.exports = {
    BaseDatabaseAdapter,
    normalizeKey,
    normalizeNamespace,
};
