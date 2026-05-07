const { inspect } = require("util");

const reset = "\x1b[0m";

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
        const timestamp = formatTime(new Date());

        entry.stream.write(`${entry.color}[${timestamp}] [${entry.label}]:${reset} ${message}\n`);
    }
}

function formatValue(value) {
    if (value instanceof Error) {
        return value.stack || value.message;
    }

    if (typeof value === "string") {
        return value;
    }

    return inspect(value, {
        colors: true,
        depth: 4,
    });
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

module.exports = new Logger();
module.exports.Logger = Logger;
