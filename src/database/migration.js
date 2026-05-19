const { DatabaseConfigurationError } = require("./errors");

const persistentProviders = new Set([
    "sqlite",
    "mysql",
    "mariadb",
    "mongodb",
    "postgresql",
]);

const conflictPolicies = new Set([
    "abort",
    "overwrite",
]);

class DatabaseMigrationConflictError extends Error {
    constructor(conflicts, stats) {
        super(`Database migration found ${conflicts.length} conflicting record(s).`);
        this.name = "DatabaseMigrationConflictError";
        this.conflicts = conflicts;
        this.stats = stats;
    }
}

async function migrateDatabaseRecords({
    source,
    target,
    onConflict = "abort",
    dryRun = false,
} = {}) {
    validateAdapter("source", source);
    validateAdapter("target", target);
    validateConflictPolicy(onConflict);

    const stats = {
        read: 0,
        copied: 0,
        overwritten: 0,
        conflicts: 0,
        dryRun: Boolean(dryRun),
    };
    const pending = [];
    const conflicts = [];

    for await (const record of source.scanRecords()) {
        const normalized = normalizeMigrationRecord(record);
        const exists = await target.has(normalized.namespace, normalized.key);

        stats.read += 1;

        if (exists) {
            stats.conflicts += 1;
            conflicts.push({
                namespace: normalized.namespace,
                key: normalized.key,
            });
        }

        pending.push({
            exists,
            record: normalized,
        });
    }

    if (onConflict === "abort" && conflicts.length > 0) {
        throw new DatabaseMigrationConflictError(conflicts, stats);
    }

    for (const item of pending) {
        if (item.exists) {
            stats.overwritten += 1;
        } else {
            stats.copied += 1;
        }

        if (!dryRun) {
            await target.writeRecord(item.record);
        }
    }

    return stats;
}

function validateAdapter(role, adapter) {
    if (!adapter?.config?.provider) {
        throw new DatabaseConfigurationError(`Database migration ${role} is missing a provider.`);
    }

    if (!persistentProviders.has(adapter.config.provider)) {
        throw new DatabaseConfigurationError(`Database migration ${role} provider "${adapter.config.provider}" is not persistent.`);
    }

    for (const method of ["scanRecords", "has", "writeRecord"]) {
        if (typeof adapter[method] !== "function") {
            throw new DatabaseConfigurationError(`Database migration ${role} provider "${adapter.config.provider}" does not support ${method}().`);
        }
    }
}

function validateConflictPolicy(value) {
    if (!conflictPolicies.has(value)) {
        throw new DatabaseConfigurationError(`Unsupported conflict policy "${value}". Use "abort" or "overwrite".`);
    }
}

function normalizeMigrationRecord(record) {
    const namespace = String(record?.namespace || "").trim();
    const key = String(record?.key || "").trim();

    if (!namespace || !key) {
        throw new DatabaseConfigurationError("Database migration records must include namespace and key.");
    }

    return {
        namespace,
        key,
        value: record.value,
        updatedAt: normalizeDate(record.updatedAt),
    };
}

function normalizeDate(value) {
    if (!value) return new Date();
    if (value instanceof Date) return value;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? new Date() : date;
}

module.exports = {
    DatabaseMigrationConflictError,
    migrateDatabaseRecords,
};
