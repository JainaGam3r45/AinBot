const path = require("path");
const { DatabaseConfigurationError } = require("./errors");

const providers = new Set([
    "none",
    "memory",
    "sqlite",
    "mysql",
    "mariadb",
    "mongodb",
    "postgresql",
    "postgres",
]);

function loadDatabaseConfig(env = process.env) {
    const provider = normalizeProvider(env.DATABASE_PROVIDER || "none");
    const url = optional(env.DATABASE_URL);

    return {
        provider,
        url,
        host: optional(env.DATABASE_HOST) || "localhost",
        port: parsePort(env.DATABASE_PORT),
        user: optional(env.DATABASE_USER),
        password: optional(env.DATABASE_PASSWORD),
        name: optional(env.DATABASE_NAME) || parseDatabaseName(url) || "ainbot",
        sqlitePath: resolveSqlitePath(env.DATABASE_PATH),
        tableName: normalizeIdentifier(env.DATABASE_TABLE || "ainbot_records"),
        mongoCollection: normalizeMongoName(env.DATABASE_COLLECTION || "ainbot_records"),
        ssl: parseBoolean(env.DATABASE_SSL),
    };
}

function normalizeProvider(value) {
    const provider = String(value).trim().toLowerCase();

    if (!providers.has(provider)) {
        throw new DatabaseConfigurationError(`Unsupported database provider "${value}".`);
    }

    return provider === "postgres" ? "postgresql" : provider;
}

function parsePort(value) {
    if (!optional(value)) return null;

    const port = Number(value);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new DatabaseConfigurationError("DATABASE_PORT must be a valid TCP port.");
    }

    return port;
}

function parseBoolean(value) {
    if (!optional(value)) return false;

    return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeIdentifier(value) {
    const identifier = String(value).trim();

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        throw new DatabaseConfigurationError("DATABASE_TABLE must be a simple SQL identifier.");
    }

    return identifier;
}

function normalizeMongoName(value) {
    const name = String(value).trim();

    if (!name || name.includes("$") || name.includes("\0")) {
        throw new DatabaseConfigurationError("DATABASE_COLLECTION must be a valid MongoDB collection name.");
    }

    return name;
}

function resolveSqlitePath(value) {
    const configuredPath = optional(value) || path.join("data", "ainbot.sqlite");

    return path.isAbsolute(configuredPath)
        ? configuredPath
        : path.join(process.cwd(), configuredPath);
}

function parseDatabaseName(value) {
    if (!value) return null;

    try {
        const parsedUrl = new URL(value);
        const name = parsedUrl.pathname.replace(/^\/+/, "").split("/")[0];

        return name || null;
    } catch {
        return null;
    }
}

function optional(value) {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();

    return trimmed ? trimmed : null;
}

module.exports = {
    loadDatabaseConfig,
};
