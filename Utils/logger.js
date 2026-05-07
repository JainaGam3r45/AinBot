const { inspect } = require("util");

const reset = "\x1b[0m";
const dim = "\x1b[2m";

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
    /** Writes a debug message. */
    debug(...values) {
        this.write("debug", values);
    }

    /** Writes an info message. */
    info(...values) {
        this.write("info", values);
    }

    /** Writes a warning message. */
    warn(...values) {
        this.write("warn", values);
    }

    /** Writes an error message. */
    error(...values) {
        this.write("error", values);
    }

    /** Logs an operational issue that should be investigated. */
    issue(context, error) {
        this.error(`${context}:`, error);
    }

    /** Logs a recovered error without stopping the bot. */
    recovered(context, error) {
        this.warn(`${context}. Recovered without shutting down.`, error);
    }

    /** Logs a critical error before shutdown. */
    critical(context, error) {
        this.error(`${context}. Critical shutdown required.`, error);
    }

    /** Writes a message with a dynamic log level. */
    log(level, ...values) {
        if (!levels[level]) {
            this.info(level, ...values);
            return;
        }

        this.write(level, values);
    }

    /** Formats and writes a log entry. */
    write(level, values) {
        const entry = levels[level];
        const message = values.length ? values.map(formatValue).join(" ") : "";
        const timestamp = `${dim}[${formatTime(new Date())}]${reset}`;
        const label = `${entry.color}[${entry.label}]:${reset}`;

        entry.stream.write(`${timestamp} ${label} ${message}\n`);
    }
}

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

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

module.exports = new Logger();
module.exports.Logger = Logger;
