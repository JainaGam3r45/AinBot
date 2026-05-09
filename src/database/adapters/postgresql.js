const { requireDriver } = require("./dependencies");
const { SqlRecordAdapter } = require("./sql");

class PostgresqlDatabaseAdapter extends SqlRecordAdapter {
    constructor(config) {
        super(config);
        this.identifierQuote = '"';
        this.pool = null;
    }

    async connect() {
        const { Pool } = requireDriver("postgresql", ["pg"]);

        this.pool = new Pool(getConnectionOptions(this.config));

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS ${this.table()} (
                namespace VARCHAR(120) NOT NULL,
                record_key VARCHAR(180) NOT NULL,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (namespace, record_key)
            )
        `);

        this.connected = true;
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }

        this.connected = false;
    }

    async ping() {
        await this.pool.query("SELECT 1");

        return true;
    }

    async get(namespace, key) {
        const records = await this.pool.query(`
            SELECT value
            FROM ${this.table()}
            WHERE namespace = $1 AND record_key = $2
        `, [namespace, key]);

        return records.rows[0] ? records.rows[0].value : null;
    }

    async set(namespace, key, value) {
        await this.pool.query(`
            INSERT INTO ${this.table()} (namespace, record_key, value, updated_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (namespace, record_key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [namespace, key, this.serialize(value)]);

        return value;
    }

    async delete(namespace, key) {
        const operation = await this.pool.query(`
            DELETE FROM ${this.table()}
            WHERE namespace = $1 AND record_key = $2
        `, [namespace, key]);

        return operation.rowCount > 0;
    }

    async list(namespace) {
        const records = await this.pool.query(`
            SELECT record_key AS key, value, updated_at AS "updatedAt"
            FROM ${this.table()}
            WHERE namespace = $1
            ORDER BY record_key ASC
        `, [namespace]);

        return records.rows;
    }
}

function getConnectionOptions(config) {
    if (config.url) {
        return {
            connectionString: config.url,
            max: 10,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        };
    }

    return {
        host: config.host,
        port: config.port || 5432,
        user: config.user,
        password: config.password,
        database: config.name,
        max: 10,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    };
}

module.exports = {
    PostgresqlDatabaseAdapter,
};
