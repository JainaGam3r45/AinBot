const logger = require("../core/runtime/logger");
const { createDatabase } = require(".");
const { DatabaseMigrationConflictError, migrateDatabaseRecords } = require("./migration");

async function main(argv = process.argv.slice(2), env = process.env) {
    let options;

    try {
        options = parseArguments(argv);
    } catch (error) {
        logger.issue("Database migration failed", error);
        return 1;
    }

    if (options.help) {
        logger.info(getHelpText());
        return 0;
    }

    let source = null;
    let target = null;

    try {
        source = await createDatabase(env, "DATABASE_SOURCE");
        target = await createDatabase(env, "DATABASE_TARGET");

        logger.info(`Migration source provider: ${source.config.provider}.`);
        logger.info(`Migration target provider: ${target.config.provider}.`);

        const stats = await migrateDatabaseRecords({
            source,
            target,
            onConflict: options.onConflict,
            dryRun: options.dryRun,
        });

        logStats(stats, options);

        return 0;
    } catch (error) {
        if (error instanceof DatabaseMigrationConflictError) {
            logger.error(error.message);
            logger.error(formatConflicts(error.conflicts));
            logStats(error.stats, options);
            return 1;
        }

        logger.issue("Database migration failed", error);
        return 1;
    } finally {
        await closeDatabase("source", source);
        await closeDatabase("target", target);
    }
}

function parseArguments(argv) {
    const options = {
        dryRun: false,
        help: false,
        onConflict: "abort",
    };

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (argument === "--dry-run") {
            options.dryRun = true;
            continue;
        }

        if (argument === "--help" || argument === "-h") {
            options.help = true;
            continue;
        }

        if (argument === "--on-conflict") {
            index += 1;
            options.onConflict = normalizeConflictPolicy(argv[index]);
            continue;
        }

        if (argument.startsWith("--on-conflict=")) {
            options.onConflict = normalizeConflictPolicy(argument.slice("--on-conflict=".length));
            continue;
        }

        throw new Error(`Unsupported migration option "${argument}".`);
    }

    return options;
}

function normalizeConflictPolicy(value) {
    const policy = String(value || "").trim().toLowerCase();

    if (policy !== "abort" && policy !== "overwrite") {
        throw new Error('Migration option "--on-conflict" must be "abort" or "overwrite".');
    }

    return policy;
}

function logStats(stats, options) {
    const action = options.dryRun ? "validated" : "completed";

    logger.info(`Database migration ${action}.`);
    logger.info(`Records read: ${stats.read}.`);
    logger.info(`Records copied: ${stats.copied}.`);
    logger.info(`Records overwritten: ${stats.overwritten}.`);
    logger.info(`Conflicts detected: ${stats.conflicts}.`);
}

function formatConflicts(conflicts) {
    const preview = conflicts
        .slice(0, 10)
        .map((conflict) => `${conflict.namespace}:${conflict.key}`)
        .join(", ");
    const suffix = conflicts.length > 10 ? `, and ${conflicts.length - 10} more` : "";

    return `Conflicting records: ${preview}${suffix}.`;
}

async function closeDatabase(role, database) {
    if (!database) return;

    try {
        await database.close();
    } catch (error) {
        logger.issue(`Failed to close migration ${role} database`, error);
    }
}

function getHelpText() {
    return [
        "Usage: bun run database:migrate [--dry-run] [--on-conflict abort|overwrite]",
        "",
        "Required environment prefixes:",
        "  DATABASE_SOURCE_PROVIDER, DATABASE_SOURCE_URL, DATABASE_SOURCE_PATH, ...",
        "  DATABASE_TARGET_PROVIDER, DATABASE_TARGET_URL, DATABASE_TARGET_PATH, ...",
    ].join("\n");
}

if (require.main === module) {
    main().then((exitCode) => {
        process.exitCode = exitCode;
    });
}

module.exports = {
    main,
    parseArguments,
};
