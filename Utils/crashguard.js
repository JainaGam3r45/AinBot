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
        [Events.Error, (error) => logger.recovered("Error del cliente de Discord", error)],
        [Events.Warn, (message) => logger.warn("Advertencia de Discord:", message)],
        [Events.ShardError, (error, shardId) => logger.recovered(`Error del shard ${shardId} de Discord`, error)],
        [Events.Debug, (message) => logger.debug("Discord debug:", message)],
        [Events.Invalidated, () => handleInvalidatedSession(client)],
    ];

    for (const [eventName, handler] of clientHandlers) {
        client.on(eventName, handler);
    }

    client.crashGuard = {
        /**
         * Removes every crash guard listener.
         */
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

/**
 * Logs an unhandled rejected promise without shutting down.
 * @param {unknown} reason Rejection reason.
 */
function handleUnhandledRejection(reason) {
    logger.recovered("Promesa rechazada sin manejar", normalizeError(reason));
}

/**
 * Logs a process warning.
 * @param {Error} warning Warning emitted by Node.js.
 */
function handleWarning(warning) {
    logger.warn("Advertencia del proceso:", warning);
}

/**
 * Logs an uncaught exception and shuts the bot down.
 * @param {Client} client Discord client to shut down.
 * @param {Error} error Uncaught exception.
 */
function handleCriticalException(client, error) {
    logger.critical("Excepción no capturada", error);
    shutdown(client, 1);
}

/**
 * Logs an invalid Discord session and shuts the bot down.
 * @param {Client} client Discord client to shut down.
 */
function handleInvalidatedSession(client) {
    logger.critical("La sesión de Discord fue invalidada");
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
        logger.issue("No se pudo destruir el cliente de Discord durante el apagado", error);
    } finally {
        setImmediate(() => process.exit(exitCode));
    }
}

/**
 * Converts any thrown value into an Error.
 * @param {unknown} value Value to normalize.
 */
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
