const { inspect } = require("util");
const { Client, Events } = require("discord.js");
const logger = require("./logger");

/**
 * Installs process and Discord client crash handlers once.
 * @param {Client} client Discord client to protect.
 */
function installCrashGuard(client) {
    if (client.crashGuard) return;

    const processHandlers = [
        ["unhandledRejection", handleUnhandledRejection],
        ["warning", handleWarning],
        ["uncaughtException", (error) => handleCriticalException(client, error)],
    ];

    for (const [eventName, handler] of processHandlers) {
        process.on(eventName, handler);
    }

    const clientHandlers = [
        [Events.Error, (error) => logger.recovered("Discord client error", error)],
        [Events.Warn, (message) => logger.warn("Discord warning:", message)],
        [Events.ShardError, (error, shardId) => logger.recovered(`Discord shard ${shardId} error`, error)],
        [Events.Debug, (message) => logger.debug("Discord debug:", message)],
        [Events.Invalidated, () => handleInvalidatedSession(client)],
    ];

    for (const [eventName, handler] of clientHandlers) {
        client.on(eventName, handler);
    }

    client.crashGuard = {
        dispose() {
            for (const [eventName, handler] of processHandlers) {
                process.removeListener(eventName, handler);
            }

            for (const [eventName, handler] of clientHandlers) {
                client.removeListener(eventName, handler);
            }

            client.crashGuard = null;
        },
    };

    logger.info("Crash guard is active.");
}

function handleUnhandledRejection(reason) {
    logger.recovered("Unhandled promise rejection", normalizeError(reason));
}

function handleWarning(warning) {
    logger.warn("Process warning:", warning);
}

function handleCriticalException(client, error) {
    logger.critical("Uncaught exception", error);
    shutdown(client, 1);
}

function handleInvalidatedSession(client) {
    logger.critical("Discord session was invalidated");
    shutdown(client, 1);
}

/**
 * Destroys the Discord client and exits the process with the given code.
 * @param {Client} client Discord client to shut down.
 * @param {number} exitCode Process exit code.
 */
function shutdown(client, exitCode) {
    process.exitCode = exitCode;

    try {
        client.destroy();
    } catch (error) {
        logger.issue("Could not destroy Discord client during shutdown", error);
    } finally {
        setImmediate(() => process.exit(exitCode));
    }
}

function normalizeError(value) {
    if (value instanceof Error) return value;

    const message = typeof value === "string"
        ? value
        : inspect(value, {
            colors: false,
            depth: 4,
        });

    return new Error(message);
}

module.exports = { installCrashGuard, shutdown };
