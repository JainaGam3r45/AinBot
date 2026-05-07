const { requireDriver } = require("./dependencies");
const { SqlRecordAdapter } = require("./sql");

class MysqlDatabaseAdapter extends SqlRecordAdapter {
    constructor(config) {
        super(config);
        this.identifierQuote = "`";
        this.pool = null;
    }

    async connect() {
        const mysql = requireDriver("mysql", ["mysql2/promise"]);

        this.pool = mysql.createPool(getConnectionOptions(this.config));

        await this.pool.execute(`
            CREATE TABLE IF NOT EXISTS ${this.table()} (
                namespace VARCHAR(120) NOT NULL,
                record_key VARCHAR(180) NOT NULL,
                value JSON NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
        await this.pool.execute("SELECT 1");

        return true;
    }

    async get(namespace, key) {
        const [rows] = await this.pool.execute(`
            SELECT value
            FROM ${this.table()}
            WHERE namespace = ? AND record_key = ?
        `, [namespace, key]);

        return rows[0] ? this.deserialize(rows[0].value) : null;
    }

    async set(namespace, key, value) {
        await this.pool.execute(`
            INSERT INTO ${this.table()} (namespace, record_key, value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
        `, [namespace, key, this.serialize(value)]);

        return value;
    }

    async delete(namespace, key) {
        const [operation] = await this.pool.execute(`
            DELETE FROM ${this.table()}
            WHERE namespace = ? AND record_key = ?
        `, [namespace, key]);

        return operation.affectedRows > 0;
    }

    async list(namespace) {
        const [rows] = await this.pool.execute(`
            SELECT record_key AS \`key\`, value, updated_at AS updatedAt
            FROM ${this.table()}
            WHERE namespace = ?
            ORDER BY record_key ASC
        `, [namespace]);

        return rows.map((record) => ({
            key: record.key,
            value: this.deserialize(record.value),
            updatedAt: new Date(record.updatedAt),
        }));
    }
}

function getConnectionOptions(config) {
    if (config.url) {
        const url = new URL(config.url);

        return {
            host: url.hostname,
            port: Number(url.port) || 3306,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: url.pathname.replace(/^\/+/, "") || config.name,
            waitForConnections: true,
            connectionLimit: 10,
            namedPlaceholders: false,
            ssl: config.ssl ? {} : undefined,
        };
    }

    return {
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.name,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: false,
        ssl: config.ssl ? {} : undefined,
    };
}

module.exports = {
    MysqlDatabaseAdapter,
};
