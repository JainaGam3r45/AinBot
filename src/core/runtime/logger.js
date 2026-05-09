const { appendFileSync, mkdirSync } = require("fs");
const path = require("path");
const { inspect } = require("util");

const reset = "\x1b[0m";
const dim = "\x1b[2m";
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const white = "\x1b[37m";
const bold = "\x1b[1m";
const logsDirectory = path.join(process.cwd(), "logs");
const activeMode = normalizeMode(process.env.AINBOT_MODE || process.env.NODE_ENV);

const levels = {
    debug: {
        label: "DEBUG",
        color: "\x1b[35m",
        stream: process.stdout,
    },
    info: {
        label: "INFO",
        color: "\x1b[36m",
        stream: process.stdout,
    },
    warn: {
        label: "WARN",
        color: "\x1b[33m",
        stream: process.stdout,
    },
    error: {
        label: "ERROR",
        color: "\x1b[31m",
        stream: process.stderr,
    },
};

class Logger {
    constructor() {
        this.mode = activeMode;
        this.debugEnabled = activeMode === "development";
    }

    /**
     * Writes a debug message.
     * @param {...unknown} values Values to print.
     */
    debug(...values) {
        if (!this.debugEnabled) return;

        this.write("debug", values);
    }

    /**
     * Writes an info message.
     * @param {...unknown} values Values to print.
     */
    info(...values) {
        this.write("info", values);
    }

    /**
     * Writes a warning message.
     * @param {...unknown} values Values to print.
     */
    warn(...values) {
        this.write("warn", values);
    }

    /**
     * Writes an error message.
     * @param {...unknown} values Values to print.
     */
    error(...values) {
        this.write("error", values);
    }

    /**
     * Logs an operational issue that should be investigated.
     * @param {string} context Short description of where the issue happened.
     * @param {unknown} error Error or value to record.
     */
    issue(context, error) {
        this.error(`${context}:`, error);
        this.writeIncident("ERROR", context, error);
    }

    /**
     * Logs a recovered error without stopping the bot.
     * @param {string} context Short description of what recovered.
     * @param {unknown} error Error or value to record.
     */
    recovered(context, error) {
        this.warn(`${context}. Recovered without shutting down.`, error);
        this.writeIncident("WARNING", context, error);
    }

    /**
     * Logs a critical error before shutdown.
     * @param {string} context Short description of the fatal failure.
     * @param {unknown} error Error or value to record.
     */
    critical(context, error) {
        this.error(`${context}. Critical shutdown required.`, error);
        this.writeIncident("CRITICAL", context, error);
    }

    /**
     * Writes a message with a dynamic log level.
     * @param {string} level Log level name.
     * @param {...unknown} values Values to print.
     */
    log(level, ...values) {
        if (!levels[level]) {
            this.info(level, ...values);
            return;
        }

        this.write(level, values);
    }

    /**
     * Writes the online startup banner.
     * @param {string} name Project name.
     * @param {string} version Project version.
     * @param {object} bot Bot user that is currently running.
     */
    onlineBanner(name, version, bot) {
        const border = "#-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=#";
        const message = centerText(`• ${name} v${version} is now Online! •`, border.length);
        const description = centerText(`Running as ${bot.tag} (${bot.id})`, border.length);

        process.stdout.write([
            colorize(border, cyan),
            "",
            colorize(message, `${bold}${green}`),
            colorize(description, white),
            "",
            colorize(border, cyan),
        ].join("\n") + "\n");
    }

    /**
     * Formats and writes a log entry.
     * @param {string} level Registered log level.
     * @param {unknown[]} values Values to print.
     */
    write(level, values) {
        const entry = levels[level];
        const message = values.length ? values.map(formatValue).join(" ") : "";
        const timestamp = `${dim}[${formatTime(new Date())}]${reset}`;
        const label = `${entry.color}[${entry.label}]:${reset}`;

        entry.stream.write(`${timestamp} ${label} ${message}\n`);
    }

    /**
     * Writes a detailed incident report to the daily anti-crash log.
     * @param {string} severity Incident severity label.
     * @param {string} context Short description of the incident.
     * @param {unknown} value Error or value to record.
     */
    writeIncident(severity, context, value) {
        const error = normalizeError(value, context);
        const timestamp = new Date();
        const logEntry = formatIncident({
            context,
            error,
            severity,
            timestamp,
        });

        try {
            mkdirSync(logsDirectory, {
                recursive: true,
            });

            appendFileSync(getLogFilePath(timestamp), `${logEntry}\n`, "utf8");
        } catch (error) {
            process.stderr.write(`Could not write anti-crash log: ${formatValue(error)}\n`);
        }
    }
}

/**
 * Formats a value for console output.
 * @param {unknown} value Value to format.
 */
function formatValue(value) {
    if (value instanceof Error) {
        return formatError(value);
    }

    if (typeof value === "string") {
        return value;
    }

    return inspect(value, {
        colors: true,
        depth: 4,
    });
}

function centerText(value, width) {
    const text = String(value);
    const padding = Math.max(width - text.length, 0);
    const left = Math.floor(padding / 2);
    const right = padding - left;

    return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}

function colorize(value, color) {
    return `${color}${value}${reset}`;
}

/**
 * Normalizes the runtime mode used by the logger.
 * @param {string | undefined} value Raw mode value.
 */
function normalizeMode(value) {
    const mode = String(value || "production").toLowerCase();

    if (mode === "development" || mode === "dev" || mode === "debug") {
        return "development";
    }

    return "production";
}

/**
 * Formats an error with stack, code, and cause details.
 * @param {Error} error Error to format.
 */
function formatError(error) {
    const details = [
        error.stack || error.message,
    ];

    if (error.code) {
        details.push(`code: ${error.code}`);
    }

    if (error.cause) {
        details.push(`cause: ${formatValue(error.cause)}`);
    }

    return details.join("\n");
}

/**
 * Formats a detailed incident log entry.
 * @param {object} incident Incident details.
 * @param {string} incident.context Context where the incident happened.
 * @param {Error} incident.error Error to record.
 * @param {string} incident.severity Severity label.
 * @param {Date} incident.timestamp Incident timestamp.
 */
function formatIncident({ context, error, severity, timestamp }) {
    const memory = process.memoryUsage();

    return [
        "=".repeat(80),
        `🕐 TIMESTAMP: ${formatIncidentTimestamp(timestamp)}`,
        `🚨 SEVERITY: ${severity}`,
        `📍 CONTEXT: ${context}`,
        `💬 MESSAGE: ${error.message}`,
        "",
        "📋 STACK TRACE:",
        error.stack || error.message,
        "",
        "💾 MEMORY:",
        `   - Used: ${toMegabytes(memory.heapUsed)}MB`,
        `   - Total: ${toMegabytes(memory.heapTotal)}MB`,
        `   - External: ${toMegabytes(memory.external)}MB`,
        "",
        "🖥️ SYSTEM:",
        `   - Platform: ${process.platform} (${process.arch})`,
        `   - Node.js: ${process.version}`,
        `   - Uptime: ${Math.floor(process.uptime())}s`,
        "=".repeat(80),
    ].join("\n");
}

/**
 * Converts any thrown value into an Error.
 * @param {unknown} value Value to normalize.
 * @param {string} fallbackMessage Message to use when the value is empty.
 */
function normalizeError(value, fallbackMessage) {
    if (value instanceof Error) return value;

    if (value === undefined || value === null) {
        return new Error(fallbackMessage);
    }

    const message = typeof value === "string"
        ? value
        : inspect(value, {
            colors: false,
            depth: 4,
        });

    return new Error(message);
}

/**
 * Builds the daily anti-crash log file path.
 * @param {Date} date Date used for the file name.
 */
function getLogFilePath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return path.join(logsDirectory, `anticrash-${year}-${month}-${day}.log`);
}

/**
 * Formats an incident timestamp with padded date and time parts.
 * @param {Date} date Date to format.
 */
function formatIncidentTimestamp(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const displayHours = String((hours % 12) || 12).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";

    return `${month}/${day}/${year}, ${displayHours}:${minutes}:${seconds} ${meridiem}`;
}

/**
 * Converts bytes to rounded megabytes.
 * @param {number} bytes Byte count.
 */
function toMegabytes(bytes) {
    return Math.round(bytes / 1024 / 1024);
}

/**
 * Formats a date as HH:mm:ss.
 * @param {Date} date Date to format.
 */
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

module.exports = new Logger();
module.exports.Logger = Logger;
