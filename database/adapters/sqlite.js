const { mkdir } = require("fs/promises");
const path = require("path");
const { requireDriver } = require("./dependencies");
const { SqlRecordAdapter } = require("./sql");

class SqliteDatabaseAdapter extends SqlRecordAdapter {
    constructor(config) {
        super(config);
        this.identifierQuote = '"';
        this.db = null;
    }

    async connect() {
        const Database = requireDriver("sqlite", ["better-sqlite3"]);

        await mkdir(path.dirname(this.config.sqlitePath), {
            recursive: true,
        });

        this.db = new Database(this.config.sqlitePath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("busy_timeout = 5000");
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.table()} (
                namespace TEXT NOT NULL,
                record_key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (namespace, record_key)
            );
        `);

        this.connected = true;
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        this.connected = false;
    }

    async ping() {
        if (!this.db) return false;

        this.db.prepare("SELECT 1").get();

        return true;
    }

    async get(namespace, key) {
        const record = this.db.prepare(`
            SELECT value
            FROM ${this.table()}
            WHERE namespace = ? AND record_key = ?
        `).get(namespace, key);

        return record ? this.deserialize(record.value) : null;
    }

    async set(namespace, key, value) {
        this.db.prepare(`
            INSERT INTO ${this.table()} (namespace, record_key, value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(namespace, record_key)
            DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).run(namespace, key, this.serialize(value));

        return value;
    }

    async delete(namespace, key) {
        const operation = this.db.prepare(`
            DELETE FROM ${this.table()}
            WHERE namespace = ? AND record_key = ?
        `).run(namespace, key);

        return operation.changes > 0;
    }

    async list(namespace) {
        return this.db.prepare(`
            SELECT record_key AS key, value, updated_at AS updatedAt
            FROM ${this.table()}
            WHERE namespace = ?
            ORDER BY record_key ASC
        `).all(namespace).map((record) => ({
            key: record.key,
            value: this.deserialize(record.value),
            updatedAt: new Date(record.updatedAt),
        }));
    }
}

module.exports = {
    SqliteDatabaseAdapter,
};
