const { appendFileSync, mkdirSync } = require("fs");
const path = require("path");
const { inspect } = require("util");

const reset = "\x1b[0m";
const dim = "\x1b[2m";
const logsDirectory = path.join(process.cwd(), "logs");

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
    debug(...values) {
        this.write("debug", values);
    }

    info(...values) {
        this.write("info", values);
    }

    warn(...values) {
        this.write("warn", values);
    }

    error(...values) {
        this.write("error", values);
    }

    issue(context, error) {
        this.error(`${context}:`, error);
        this.writeIncident("ERROR", context, error);
    }

    recovered(context, error) {
        this.warn(`${context}. Recovered without shutting down.`, error);
        this.writeIncident("WARNING", context, error);
    }

    critical(context, error) {
        this.error(`${context}. Critical shutdown required.`, error);
        this.writeIncident("CRITICAL", context, error);
    }

    log(level, ...values) {
        if (!levels[level]) {
            this.info(level, ...values);
            return;
        }

        this.write(level, values);
    }

    write(level, values) {
        const entry = levels[level];
        const message = values.length ? values.map(formatValue).join(" ") : "";
        const timestamp = `${dim}[${formatTime(new Date())}]${reset}`;
        const label = `${entry.color}[${entry.label}]:${reset}`;

        entry.stream.write(`${timestamp} ${label} ${message}\n`);
    }

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

function formatIncident({ context, error, severity, timestamp }) {
    const memory = process.memoryUsage();

    return [
        "=".repeat(80),
        `🕐 TIMESTAMP: ${timestamp.toLocaleString("en-US")}`,
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

function getLogFilePath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return path.join(logsDirectory, `anticrash-${year}-${month}-${day}.log`);
}

function toMegabytes(bytes) {
    return Math.round(bytes / 1024 / 1024);
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

module.exports = new Logger();
module.exports.Logger = Logger;
